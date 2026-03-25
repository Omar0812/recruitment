"""测试 assign_screening action 和 screening 流程相关守卫。"""
from __future__ import annotations

import os
import sys
import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base
from app.engine.errors import BusinessError
from app.engine.executor import execute
from app.models.application import Application
from app.models.enums import ActorType, ApplicationState, EventType
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
    conn = engine.connect()
    txn = conn.begin()
    session = Session(bind=conn)
    yield session
    session.close()
    txn.rollback()
    conn.close()


@pytest.fixture()
def app_in_progress(db: Session) -> Application:
    c = Candidate(name="测试候选人")
    j = Job(title="测试岗位")
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


class TestAssignScreening:
    """assign_screening action 测试。"""

    def test_assign_screening_success(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())

        receipt = execute(db, action_code="assign_screening", application=a,
                          payload={"screener": "范德彪"}, actor_type="human", command_id=_uid())
        assert receipt.ok is True
        assert receipt.stage_before == "新申请"
        assert receipt.stage_after == "简历筛选"

        # 验证 Event 创建
        screening_ev = db.query(Event).filter_by(
            application_id=a.id, type=EventType.SCREENING_ASSIGNED.value
        ).first()
        assert screening_ev is not None
        assert screening_ev.payload["screener"] == "范德彪"

    def test_assign_screening_duplicated_rejected(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="assign_screening", application=a,
                payload={"screener": "范德彪"}, actor_type="human", command_id=_uid())

        # 重复推进应被拒绝
        receipt = execute(db, action_code="assign_screening", application=a,
                          payload={"screener": "另一人"}, actor_type="human", command_id=_uid())
        assert receipt.ok is False
        assert receipt.error_code == "already_screening"

    def test_assign_screening_on_ended_application_rejected(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="end_application", application=a,
                payload={"outcome": "rejected"}, actor_type="human", command_id=_uid())

        receipt = execute(db, action_code="assign_screening", application=a,
                          payload={"screener": "范德彪"}, actor_type="human", command_id=_uid())
        assert receipt.ok is False
        assert receipt.error_code == "application_not_active"


class TestPassScreeningGuard:
    """pass_screening 守卫需要 SCREENING_ASSIGNED 前置条件。"""

    def test_pass_screening_without_assign_rejected(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())

        # 直接 pass_screening 应被拒绝（缺少 SCREENING_ASSIGNED）
        receipt = execute(db, action_code="pass_screening", application=a,
                          payload={}, actor_type="human", command_id=_uid())
        assert receipt.ok is False
        assert receipt.error_code == "stage_prerequisite_missing"

    def test_pass_screening_with_assign_succeeds(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="assign_screening", application=a,
                payload={"screener": "范德彪"}, actor_type="human", command_id=_uid())

        receipt = execute(db, action_code="pass_screening", application=a,
                          payload={}, actor_type="human", command_id=_uid())
        assert receipt.ok is True
        assert receipt.stage_before == "简历筛选"
        assert receipt.stage_after == "面试"


class TestScreeningStageDerive:
    """新申请阶段和简历筛选阶段的 stage 派生。"""

    def test_initial_stage_is_new_application(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        assert a.stage == "新申请"

    def test_after_assign_screening_stage_is_screening(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="assign_screening", application=a,
                payload={"screener": "范德彪"}, actor_type="human", command_id=_uid())
        assert a.stage == "简历筛选"

    def test_after_pass_screening_stage_is_interview(self, db, app_in_progress):
        a = app_in_progress
        execute(db, action_code="create_application", application=a,
                payload={}, actor_type="human", command_id=_uid())
        execute(db, action_code="assign_screening", application=a,
                payload={"screener": "范德彪"}, actor_type="human", command_id=_uid())
        execute(db, action_code="pass_screening", application=a,
                payload={}, actor_type="human", command_id=_uid())
        assert a.stage == "面试"
