from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.engine import guards
from app.engine.registry import register
from app.models.application import Application
from app.models.enums import EventType
from app.models.event import Event
from app.utils.time import utc_now


def _make_record_handler(event_type: EventType):
    def handler(
        db: Session,
        application: Application,
        payload: dict,
        actor_type: str,
        actor_id: int | None = None,
    ) -> Event:
        data = payload or {}
        body = data.get("body")
        if event_type is EventType.NOTE and not body:
            body = data.get("note")

        event = Event(
            application_id=application.id,
            type=event_type.value,
            occurred_at=utc_now(),
            actor_type=actor_type,
            actor_id=actor_id,
            payload=data or None,
            body=body,
        )
        db.add(event)
        return event

    handler.__name__ = f"handle_{event_type.value}"
    return handler


register(
    "schedule_interview",
    guard=guards.guard_interview_scheduled,
    handler=_make_record_handler(EventType.INTERVIEW_SCHEDULED),
)
register(
    "record_interview_feedback",
    guard=guards.guard_interview_feedback,
    handler=_make_record_handler(EventType.INTERVIEW_FEEDBACK),
)
register(
    "record_background_check_result",
    guard=guards.guard_background_check_result,
    handler=_make_record_handler(EventType.BACKGROUND_CHECK_RESULT),
)
register(
    "add_note",
    guard=guards.guard_note,
    handler=_make_record_handler(EventType.NOTE),
)
