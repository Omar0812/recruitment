"""Event 编辑/删除动作：走 executor 扩展路径。

edit_event / delete_event 作为 Application 时间线操作，
通过 executor 统一入口执行，保持写操作收口一致。
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.engine import guards
from app.engine.audit import log_audit
from app.engine.registry import register
from app.models.application import Application
from app.models.event import Event


def handle_edit_event(
    db: Session,
    application: Application,
    payload: dict[str, Any],
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    """编辑 Event 的 payload/body，同时写 audit_log 留痕。"""
    event_id = payload["event_id"]
    event = db.query(Event).filter_by(
        id=event_id, application_id=application.id,
    ).one()

    old_payload = event.payload
    old_body = event.body

    new_payload = payload.get("new_payload")
    new_body = payload.get("new_body")

    changes: dict[str, Any] = {}
    if new_payload is not None:
        changes["payload"] = {"before": old_payload, "after": new_payload}
        event.payload = new_payload
    if new_body is not None:
        changes["body"] = {"before": old_body, "after": new_body}
        event.body = new_body

    log_audit(
        db,
        actor_type=actor_type,
        action_code="edit_event",
        target_type="application",
        target_id=application.id,
        actor_id=actor_id,
        details={"event_id": event_id, "changes": changes},
    )

    return event


def handle_delete_event(
    db: Session,
    application: Application,
    payload: dict[str, Any],
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    """删除尾部 Event，同时写 audit_log 留痕（存完整快照）。"""
    event_id = payload["event_id"]
    event = db.query(Event).filter_by(
        id=event_id, application_id=application.id,
    ).one()

    snapshot = {
        "id": event.id,
        "type": event.type,
        "occurred_at": event.occurred_at.isoformat() if event.occurred_at else None,
        "actor_type": event.actor_type,
        "payload": event.payload,
        "body": event.body,
    }

    log_audit(
        db,
        actor_type=actor_type,
        action_code="delete_event",
        target_type="application",
        target_id=application.id,
        actor_id=actor_id,
        details={"deleted_event": snapshot},
    )

    db.delete(event)
    return event


register(
    "edit_event",
    guard=guards.guard_edit_event,
    handler=handle_edit_event,
)
register(
    "delete_event",
    guard=guards.guard_delete_event,
    handler=handle_delete_event,
)
