from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.engine import guards
from app.engine.registry import register
from app.models.application import Application
from app.models.enums import ApplicationState, EventType, Outcome
from app.models.event import Event
from app.utils.time import utc_now


def handle_application_created(
    db: Session,
    application: Application,
    payload: dict,
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    event = Event(
        application_id=application.id,
        type=EventType.APPLICATION_CREATED.value,
        occurred_at=utc_now(),
        actor_type=actor_type,
        actor_id=actor_id,
        payload=payload or None,
        body=(payload or {}).get("body"),
    )
    db.add(event)
    return event


def handle_application_ended(
    db: Session,
    application: Application,
    payload: dict,
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    outcome = (payload or {}).get("outcome")
    if outcome == Outcome.REJECTED.value:
        application.state = ApplicationState.REJECTED.value
        application.outcome = Outcome.REJECTED.value
    elif outcome == Outcome.WITHDRAWN.value:
        application.state = ApplicationState.WITHDRAWN.value
        application.outcome = Outcome.WITHDRAWN.value

    event = Event(
        application_id=application.id,
        type=EventType.APPLICATION_ENDED.value,
        occurred_at=utc_now(),
        actor_type=actor_type,
        actor_id=actor_id,
        payload=payload or None,
        body=(payload or {}).get("body"),
    )
    db.add(event)
    return event


def handle_left_recorded(
    db: Session,
    application: Application,
    payload: dict,
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    application.state = ApplicationState.LEFT.value
    application.outcome = Outcome.LEFT.value

    event = Event(
        application_id=application.id,
        type=EventType.LEFT_RECORDED.value,
        occurred_at=utc_now(),
        actor_type=actor_type,
        actor_id=actor_id,
        payload=payload or None,
        body=(payload or {}).get("body"),
    )
    db.add(event)
    return event


register(
    "create_application",
    guard=guards.guard_application_created,
    handler=handle_application_created,
)
register(
    "end_application",
    guard=guards.guard_application_ended,
    handler=handle_application_ended,
)
register(
    "record_left",
    guard=guards.guard_left_recorded,
    handler=handle_left_recorded,
)
