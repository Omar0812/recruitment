from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.engine import guards
from app.engine.registry import register
from app.models.application import Application
from app.models.enums import ApplicationState, EventType, Outcome
from app.models.event import Event
from app.utils.time import utc_now


def _make_advance_handler(event_type: EventType):
    def handler(
        db: Session,
        application: Application,
        payload: dict,
        actor_type: str,
        actor_id: int | None = None,
    ) -> Event:
        event = Event(
            application_id=application.id,
            type=event_type.value,
            occurred_at=utc_now(),
            actor_type=actor_type,
            actor_id=actor_id,
            payload=payload or None,
            body=(payload or {}).get("body"),
        )
        db.add(event)
        return event

    handler.__name__ = f"handle_{event_type.value}"
    return handler


def handle_hire_confirmed(
    db: Session,
    application: Application,
    payload: dict,
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    application.state = ApplicationState.HIRED.value
    application.outcome = Outcome.HIRED.value

    event = Event(
        application_id=application.id,
        type=EventType.HIRE_CONFIRMED.value,
        occurred_at=utc_now(),
        actor_type=actor_type,
        actor_id=actor_id,
        payload=payload or None,
        body=(payload or {}).get("body"),
    )
    db.add(event)
    return event


register(
    "pass_screening",
    guard=guards.guard_screening_passed,
    handler=_make_advance_handler(EventType.SCREENING_PASSED),
)
register(
    "advance_to_offer",
    guard=guards.guard_advance_to_offer,
    handler=_make_advance_handler(EventType.ADVANCE_TO_OFFER),
)
register(
    "start_background_check",
    guard=guards.guard_start_background_check,
    handler=_make_advance_handler(EventType.START_BACKGROUND_CHECK),
)
register(
    "record_offer",
    guard=guards.guard_offer_recorded,
    handler=_make_advance_handler(EventType.OFFER_RECORDED),
)
register(
    "confirm_hire",
    guard=guards.guard_hire_confirmed,
    handler=handle_hire_confirmed,
)
