"""test_executor.py — executor 端到端集成测试。"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base
from app.engine.errors import BusinessError
from app.engine.executor import execute
from app.models.action_receipt import ActionReceipt
from app.models.application import Application
from app.models.enums import ActorType, ApplicationState, EventType, Outcome
from app.models.event import Event
from app.models.legacy import Candidate, Job


def _uid() -> str:
    return str(uuid.uuid4())


@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:")

    @event.listens_for(eng, "connect")
    def _fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    """每个测试独立 session + 尾部 rollback。"""
    conn = engine.connect()
    txn = conn.begin()
    session = Session(bind=conn)
    yield session
    session.close()
    txn.rollback()
    conn.close()


@pytest.fixture()
def app_in_progress(db: Session) -> Application:
    """1 Candidate + 1 Job + 1 Application(IN_PROGRESS)。"""
    c = Candidate(name="李四")
    j = Job(title="Backend")
    db.add_all([c, j])
    db.flush()
    a = Application(
        candidate_id=c.id,
        job_id=j.id,
        state=ApplicationState.IN_PROGRESS.value,
    )
    db.add(a)
    db.flush()
    return a


class TestExecutorHappyPath:
    """正常链路：从 create_application 到 confirm_hire。"""

    def test_create_application(self, db, app_in_progress):
        receipt = execute(
            db,
            action_code="create_application",
            application=app_in_progress,
            payload={},
            actor_type=ActorType.HUMAN.value,
            command_id=_uid(),
        )
        assert receipt.ok is True
        assert receipt.stage_after == "简历筛选"
        assert app_in_progress.stage == "简历筛选"
        events = db.query(Event).filter_by(application_id=app_in_progress.id).all()
        assert len(events) == 1
        assert events[0].type == EventType.APPLICATION_CREATED.value

    def test_pass_screening(self, db, app_in_progress):
        # 先 create
        execute(db, action_code="create_application", application=app_in_progress,
                payload={}, actor_type="human", command_id=_uid())
        receipt = execute(db, action_code="pass_screening", application=app_in_progress,
                          payload={}, actor_type="human", command_id=_uid())
        assert receipt.ok is True
        assert receipt.stage_before == "简历筛选"
        assert receipt.stage_after == "面试"

    def test_advance_to_offer(self, db, app_in_progress):
        execute(db, action_code="create_application", application=app_in_progress,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="pass_screening", application=app_in_progress,
                payload={}, actor_type="human", command_id=_uid())
        receipt = execute(db, action_code="advance_to_offer", application=app_in_progress,
                          payload={}, actor_type="human", command_id=_uid())
        assert receipt.stage_after == "Offer沟通"

    def test_full_chain_to_hired(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="pass_screening", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="advance_to_offer", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="record_offer", application=a,
                payload={"cash_monthly": 30000}, actor_type="human", command_id=_uid())
        receipt = execute(db, action_code="confirm_hire", application=a,
                          payload={}, actor_type="human", command_id=_uid())

        assert receipt.ok is True
        assert receipt.stage_after == "已入职"
        assert receipt.state_after == ApplicationState.HIRED.value
        assert a.state == ApplicationState.HIRED.value
        assert a.outcome == Outcome.HIRED.value


class TestInStageRecords:
    """阶段内记录类不改变 Stage。"""

    def test_schedule_interview_keeps_stage(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="pass_screening", application=a,
                payload={}, actor_type="human", command_id=_uid())
        receipt = execute(db, action_code="schedule_interview", application=a,
                          payload={"scheduled_at": "2026-04-01T10:00:00Z"},
                          actor_type="human", command_id=_uid())
        assert receipt.stage_after == "面试"

    def test_note_on_any_stage(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        receipt = execute(db, action_code="add_note", application=a,
                          payload={"body": "候选人沟通意愿强"},
                          actor_type="human", command_id=_uid())
        assert receipt.ok is True
        assert receipt.stage_after == "简历筛选"
        ev = db.query(Event).filter_by(
            application_id=a.id, type=EventType.NOTE.value
        ).first()
        assert ev.body == "候选人沟通意愿强"


class TestLifecycle:
    """终态转换测试。"""

    def test_end_application_rejected(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        receipt = execute(
            db, action_code="end_application", application=a,
            payload={"outcome": "rejected", "reason_category": "经验不足"},
            actor_type="human", command_id=_uid(),
        )
        assert receipt.ok is True
        assert a.state == ApplicationState.REJECTED.value
        assert a.outcome == Outcome.REJECTED.value

    def test_end_application_withdrawn(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        receipt = execute(
            db, action_code="end_application", application=a,
            payload={"outcome": "withdrawn"},
            actor_type="human", command_id=_uid(),
        )
        assert a.state == ApplicationState.WITHDRAWN.value

    def test_left_recorded_after_hired(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="pass_screening", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="advance_to_offer", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="record_offer", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="confirm_hire", application=a,
                payload={}, actor_type="human", command_id=_uid())

        receipt = execute(
            db, action_code="record_left", application=a,
            payload={"left_date": "2026-06-01", "left_reason": "个人原因"},
            actor_type="human", command_id=_uid(),
        )
        assert a.state == ApplicationState.LEFT.value
        assert a.outcome == Outcome.LEFT.value


class TestGuardRejection:
    """Guard 拒绝非法操作。"""

    def test_advance_on_ended_application(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="end_application", application=a,
                payload={"outcome": "rejected"}, actor_type="human", command_id=_uid())

        receipt = execute(
            db, action_code="pass_screening", application=a,
            payload={}, actor_type="human", command_id=_uid(),
        )
        assert receipt.ok is False
        assert receipt.error_code == "application_not_active"

    def test_left_on_in_progress(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())

        receipt = execute(
            db, action_code="record_left", application=a,
            payload={}, actor_type="human", command_id=_uid(),
        )
        assert receipt.ok is False
        assert receipt.error_code == "not_hired"

    def test_interview_without_screening(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())

        receipt = execute(
            db, action_code="schedule_interview", application=a,
            payload={}, actor_type="human", command_id=_uid(),
        )
        assert receipt.ok is False
        assert receipt.error_code == "stage_prerequisite_missing"


class TestIdempotency:
    """幂等回放。"""

    def test_same_command_id_returns_same_receipt(self, db, app_in_progress):
        a = app_in_progress
        cmd = _uid()
        r1 = execute(db, action_code="create_application", application=a,
                      payload={}, actor_type="human", command_id=cmd)
        r2 = execute(db, action_code="create_application", application=a,
                      payload={}, actor_type="human", command_id=cmd)
        assert r1.id == r2.id
        events = db.query(Event).filter_by(application_id=a.id).all()
        assert len(events) == 1  # 只有 1 条 Event

    def test_guard_failure_idempotent(self, db, app_in_progress):
        a = app_in_progress
        cmd = _uid()
        r1 = execute(db, action_code="record_left", application=a,
                      payload={}, actor_type="human", command_id=cmd)
        r2 = execute(db, action_code="record_left", application=a,
                      payload={}, actor_type="human", command_id=cmd)
        assert r1.id == r2.id
        assert r1.ok is False


class TestReceiptSnapshot:
    """receipt 快照字段验证。"""

    def test_state_and_stage_snapshot(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())

        receipt = execute(db, action_code="pass_screening", application=a,
                          payload={}, actor_type="human", command_id=_uid())
        assert receipt.state_before == ApplicationState.IN_PROGRESS.value
        assert receipt.state_after == ApplicationState.IN_PROGRESS.value
        assert receipt.stage_before == "简历筛选"
        assert receipt.stage_after == "面试"

    def test_hire_state_transition_snapshot(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="pass_screening", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="advance_to_offer", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="record_offer", application=a,
                payload={}, actor_type="human", command_id=_uid())

        receipt = execute(db, action_code="confirm_hire", application=a,
                          payload={}, actor_type="human", command_id=_uid())
        assert receipt.state_before == ApplicationState.IN_PROGRESS.value
        assert receipt.state_after == ApplicationState.HIRED.value
        assert receipt.stage_before == "待入职"
        assert receipt.stage_after == "已入职"
