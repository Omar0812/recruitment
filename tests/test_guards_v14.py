"""Guard 收紧测试 — v1.4-pipeline-flow change."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.engine.errors import BusinessError
from app.engine.guards import (
    guard_advance_to_offer,
    guard_interview_feedback,
    guard_offer_recorded,
    guard_start_background_check,
)
from app.models.application import Application
from app.models.enums import ApplicationState, EventType
from app.models.event import Event
from app.models.legacy import Candidate, Job


# ── Fixtures ──

@pytest.fixture
def engine():
    e = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(e)
    return e


@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def _now():
    return datetime.now(timezone.utc)


@pytest.fixture
def app_with_events(db):
    """创建带事件链的 Application 工厂。"""
    candidate = Candidate(name="张三")
    db.add(candidate)
    db.flush()

    job = Job(title="后端工程师", headcount=1, status="open")
    db.add(job)
    db.flush()

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        state=ApplicationState.IN_PROGRESS.value,
    )
    db.add(application)
    db.flush()

    def add_event(event_type: str, payload: Optional[dict] = None):
        ev = Event(
            application_id=application.id,
            type=event_type,
            occurred_at=_now(),
            actor_type="human",
            payload=payload,
        )
        db.add(ev)
        db.flush()
        # 刷新 events relationship
        db.refresh(application)
        return ev

    return application, add_event


# ── guard_interview_feedback ──

class TestGuardInterviewFeedback:
    def test_reject_without_interview_scheduled(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        # 没有 interview_scheduled → 应拒绝
        with pytest.raises(BusinessError) as exc:
            guard_interview_feedback(app, {})
        assert "安排面试" in exc.value.message

    def test_pass_with_interview_scheduled(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.INTERVIEW_SCHEDULED.value, {"scheduled_at": "2026-03-15T10:00:00Z"})
        # 有 interview_scheduled → 通过
        guard_interview_feedback(app, {})  # 不抛异常


# ── guard_advance_to_offer ──

class TestGuardAdvanceToOffer:
    def test_reject_without_feedback(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.INTERVIEW_SCHEDULED.value)
        # 没有面评 → 拒绝
        with pytest.raises(BusinessError) as exc:
            guard_advance_to_offer(app, {})
        assert "面评通过" in exc.value.message

    def test_reject_with_fail_feedback(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.INTERVIEW_SCHEDULED.value)
        add_event(EventType.INTERVIEW_FEEDBACK.value, {"conclusion": "fail"})
        # 面评 fail → 拒绝
        with pytest.raises(BusinessError) as exc:
            guard_advance_to_offer(app, {})
        assert "面评通过" in exc.value.message

    def test_pass_with_pass_feedback(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.INTERVIEW_SCHEDULED.value)
        add_event(EventType.INTERVIEW_FEEDBACK.value, {"conclusion": "pass"})
        guard_advance_to_offer(app, {})  # 不抛异常


# ── guard_start_background_check ──

class TestGuardStartBackgroundCheck:
    def test_reject_without_advance_to_offer(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        # 没有 advance_to_offer → 拒绝
        with pytest.raises(BusinessError) as exc:
            guard_start_background_check(app, {})
        assert "Offer" in exc.value.message

    def test_pass_with_advance_to_offer(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.ADVANCE_TO_OFFER.value)
        guard_start_background_check(app, {})  # 不抛异常


# ── guard_offer_recorded ──

class TestGuardOfferRecorded:
    def test_reject_without_background_check(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.ADVANCE_TO_OFFER.value)
        add_event(EventType.START_BACKGROUND_CHECK.value)
        # 没有背调结果 → 拒绝
        with pytest.raises(BusinessError) as exc:
            guard_offer_recorded(app, {})
        assert "背调通过" in exc.value.message

    def test_reject_with_fail_background_check(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.ADVANCE_TO_OFFER.value)
        add_event(EventType.START_BACKGROUND_CHECK.value)
        add_event(EventType.BACKGROUND_CHECK_RESULT.value, {"result": "fail"})
        # 背调 fail → 拒绝
        with pytest.raises(BusinessError) as exc:
            guard_offer_recorded(app, {})
        assert "背调通过" in exc.value.message

    def test_pass_with_pass_background_check(self, app_with_events):
        app, add_event = app_with_events
        add_event(EventType.APPLICATION_CREATED.value)
        add_event(EventType.SCREENING_PASSED.value)
        add_event(EventType.ADVANCE_TO_OFFER.value)
        add_event(EventType.START_BACKGROUND_CHECK.value)
        add_event(EventType.BACKGROUND_CHECK_RESULT.value, {"result": "pass"})
        guard_offer_recorded(app, {})  # 不抛异常
