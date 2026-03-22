"""test_guards.py — Guard 约束校验测试。"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.engine.errors import BusinessError
from app.engine.guards import (
    guard_advance_to_offer,
    guard_application_ended,
    guard_background_check_result,
    guard_hire_confirmed,
    guard_interview_feedback,
    guard_interview_scheduled,
    guard_left_recorded,
    guard_note,
    guard_offer_recorded,
    guard_screening_passed,
    guard_start_background_check,
    require_active,
    require_event_exists,
)
from app.models.enums import ApplicationState, EventType
from app.models.event import Event


def _evt(event_type: str) -> Event:
    return Event(
        application_id=1,
        type=event_type,
        occurred_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        actor_type="human",
    )


class _FakeApp:
    def __init__(self, state: str, events: list | None = None):
        self.state = state
        self.events = events or []


class TestRequireActive:
    def test_in_progress_passes(self):
        app = _FakeApp(ApplicationState.IN_PROGRESS.value)
        require_active(app)  # 不抛异常

    def test_rejected_raises(self):
        app = _FakeApp(ApplicationState.REJECTED.value)
        with pytest.raises(BusinessError) as exc_info:
            require_active(app)
        assert exc_info.value.code == "application_not_active"

    def test_hired_raises(self):
        app = _FakeApp(ApplicationState.HIRED.value)
        with pytest.raises(BusinessError) as exc_info:
            require_active(app)
        assert exc_info.value.code == "application_not_active"


class TestRequireEventExists:
    def test_event_present_passes(self):
        app = _FakeApp(
            ApplicationState.IN_PROGRESS.value,
            [_evt(EventType.SCREENING_PASSED.value)],
        )
        require_event_exists(
            app, EventType.SCREENING_PASSED.value, "简历筛选通过",
        )

    def test_event_missing_raises(self):
        app = _FakeApp(ApplicationState.IN_PROGRESS.value, [])
        with pytest.raises(BusinessError) as exc_info:
            require_event_exists(
                app, EventType.SCREENING_PASSED.value, "简历筛选通过",
            )
        assert exc_info.value.code == "stage_prerequisite_missing"


class TestGuardInterviewScheduled:
    def test_with_screening_passed(self):
        app = _FakeApp(
            ApplicationState.IN_PROGRESS.value,
            [_evt(EventType.SCREENING_PASSED.value)],
        )
        guard_interview_scheduled(app, {})  # OK

    def test_without_screening_passed(self):
        app = _FakeApp(ApplicationState.IN_PROGRESS.value, [])
        with pytest.raises(BusinessError) as exc_info:
            guard_interview_scheduled(app, {})
        assert exc_info.value.code == "stage_prerequisite_missing"


class TestGuardHireConfirmed:
    def test_with_offer_recorded(self):
        app = _FakeApp(
            ApplicationState.IN_PROGRESS.value,
            [_evt(EventType.OFFER_RECORDED.value)],
        )
        guard_hire_confirmed(app, {})

    def test_without_offer_recorded(self):
        app = _FakeApp(ApplicationState.IN_PROGRESS.value, [])
        with pytest.raises(BusinessError) as exc_info:
            guard_hire_confirmed(app, {})
        assert exc_info.value.code == "stage_prerequisite_missing"


class TestGuardLeftRecorded:
    def test_hired_passes(self):
        app = _FakeApp(ApplicationState.HIRED.value)
        guard_left_recorded(app, {})

    def test_in_progress_raises(self):
        app = _FakeApp(ApplicationState.IN_PROGRESS.value)
        with pytest.raises(BusinessError) as exc_info:
            guard_left_recorded(app, {})
        assert exc_info.value.code == "not_hired"


class TestGuardNote:
    def test_any_state_passes(self):
        for state in ApplicationState:
            app = _FakeApp(state.value)
            guard_note(app, {})  # 不抛异常
