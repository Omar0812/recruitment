"""test_stage_derive.py — Stage 派生纯函数测试。"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.engine.stage import STAGE_MAP, derive
from app.models.enums import EventType
from app.models.event import Event


def _make_event(event_type: str, minutes_offset: int = 0) -> Event:
    """构造内存 Event 对象（不落库）。"""
    return Event(
        application_id=1,
        type=event_type,
        occurred_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        actor_type="human",
    )


class _FakeApp:
    """只用于测试 derive() 的假 Application。"""

    def __init__(self, events: list[Event]):
        self.events = events


class TestStageDerive:
    def test_empty_events_returns_none(self):
        app = _FakeApp([])
        assert derive(app) is None

    def test_single_application_created(self):
        app = _FakeApp([_make_event(EventType.APPLICATION_CREATED.value)])
        assert derive(app) == "简历筛选"

    def test_screening_passed(self):
        app = _FakeApp([
            _make_event(EventType.APPLICATION_CREATED.value),
            _make_event(EventType.SCREENING_PASSED.value),
        ])
        assert derive(app) == "面试"

    def test_in_stage_events_dont_change_stage(self):
        app = _FakeApp([
            _make_event(EventType.APPLICATION_CREATED.value),
            _make_event(EventType.SCREENING_PASSED.value),
            _make_event(EventType.INTERVIEW_SCHEDULED.value),
            _make_event(EventType.INTERVIEW_FEEDBACK.value),
        ])
        assert derive(app) == "面试"

    def test_note_doesnt_change_stage(self):
        app = _FakeApp([
            _make_event(EventType.APPLICATION_CREATED.value),
            _make_event(EventType.NOTE.value),
        ])
        assert derive(app) == "简历筛选"

    def test_full_chain_to_hired(self):
        app = _FakeApp([
            _make_event(EventType.APPLICATION_CREATED.value),
            _make_event(EventType.SCREENING_PASSED.value),
            _make_event(EventType.ADVANCE_TO_OFFER.value),
            _make_event(EventType.START_BACKGROUND_CHECK.value),
            _make_event(EventType.OFFER_RECORDED.value),
            _make_event(EventType.HIRE_CONFIRMED.value),
        ])
        assert derive(app) == "已入职"

    def test_background_check_after_offer(self):
        app = _FakeApp([
            _make_event(EventType.APPLICATION_CREATED.value),
            _make_event(EventType.SCREENING_PASSED.value),
            _make_event(EventType.ADVANCE_TO_OFFER.value),
            _make_event(EventType.START_BACKGROUND_CHECK.value),
        ])
        assert derive(app) == "背调"

    def test_stage_map_covers_all_advance_types(self):
        advance_types = {
            EventType.APPLICATION_CREATED.value,
            EventType.SCREENING_PASSED.value,
            EventType.ADVANCE_TO_OFFER.value,
            EventType.START_BACKGROUND_CHECK.value,
            EventType.OFFER_RECORDED.value,
            EventType.HIRE_CONFIRMED.value,
        }
        assert set(STAGE_MAP.keys()) == advance_types
