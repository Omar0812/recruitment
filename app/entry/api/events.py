"""Events API: GET /events?application_id= & PUT /events/{id}"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.audit import log_audit
from app.engine.version import check_version, bump_version
from app.entry.deps import current_user
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    application_id: int = Query(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Event, User)
        .outerjoin(User, Event.actor_id == User.id)
        .filter(Event.application_id == application_id)
        .order_by(Event.occurred_at.desc())
        .all()
    )
    result = []
    for event, actor in rows:
        data = EventRead.model_validate(event)
        if actor is not None:
            data.actor_display_name = actor.display_name
            data.actor_deleted = actor.deleted_at is not None
        result.append(data)
    return result


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    data: EventUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter_by(id=event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    check_version(event, data.version)

    changes: dict[str, Any] = {}

    if data.payload is not None:
        old_payload = event.payload or {}
        merged = {**old_payload, **data.payload}
        changes["payload"] = {"before": old_payload, "after": merged}
        event.payload = merged

    if data.body is not None:
        changes["body"] = {"before": event.body, "after": data.body}
        event.body = data.body

    if changes:
        bump_version(event)
        log_audit(
            db,
            actor_type="human",
            action_code="edit_event",
            target_type="application",
            target_id=event.application_id,
            actor_id=user.id,
            details={"event_id": event_id, "changes": changes},
        )

    db.commit()
    db.refresh(event)
    return event
