"""test_three_track.py — 端到端三轨分流验证。

- Application 业务动作只写 events + receipts，不写 audit_logs
- entity_writer 只写 audit_logs + receipts，不写 events
"""
from __future__ import annotations

import uuid

from app.engine import entity_writer
from app.engine.executor import execute
from app.models.action_receipt import ActionReceipt
from app.models.audit_log import AuditLog
from app.models.enums import ActorType
from app.models.event import Event


def _uid() -> str:
    return str(uuid.uuid4())


class TestThreeTrackRouting:
    def test_executor_does_not_write_audit_logs(self, db, app_in_progress):
        """Application 业务动作：只写 events + receipts。"""
        a = app_in_progress
        execute(
            db, action_code="create_application", application=a,
            payload={}, actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )

        events = db.query(Event).filter_by(application_id=a.id).all()
        receipts = db.query(ActionReceipt).filter_by(
            action_code="create_application",
        ).all()
        audits = db.query(AuditLog).all()

        assert len(events) == 1
        assert len(receipts) == 1
        assert len(audits) == 0

    def test_entity_writer_does_not_write_events(self, db):
        """非 Application 写操作：只写 audit_logs + receipts。"""
        entity_writer.write(
            db,
            action_code="create_job",
            target_type="job",
            target_id=99,
            actor_type="human",
            command_id=_uid(),
            details={"title": "前端工程师"},
        )

        events = db.query(Event).all()
        audits = db.query(AuditLog).filter_by(action_code="create_job").all()
        receipts = db.query(ActionReceipt).filter_by(action_code="create_job").all()

        assert len(events) == 0
        assert len(audits) == 1
        assert len(receipts) == 1

    def test_edit_event_writes_both_event_update_and_audit(self, db, app_with_events):
        """编辑 Event：更新 events + 写 audit_logs + 写 receipts（例外路径）。"""
        a = app_with_events["application"]
        events = sorted(a.events, key=lambda e: e.occurred_at)
        target = events[-1]

        execute(
            db, action_code="edit_event", application=a,
            payload={"event_id": target.id, "new_payload": {"edited": True}},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )

        audits = db.query(AuditLog).filter_by(action_code="edit_event").all()
        assert len(audits) == 1

        receipts = db.query(ActionReceipt).filter_by(action_code="edit_event").all()
        assert len(receipts) == 1

    def test_delete_event_writes_audit_and_removes_event(self, db, app_with_events):
        """删除 Event：移除 events + 写 audit_logs + 写 receipts（例外路径）。"""
        a = app_with_events["application"]
        events = sorted(a.events, key=lambda e: e.occurred_at)
        tail = events[-1]
        tail_id = tail.id
        initial_event_count = len(events)

        execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": tail_id},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )

        remaining = db.query(Event).filter_by(application_id=a.id).count()
        assert remaining == initial_event_count - 1

        audits = db.query(AuditLog).filter_by(action_code="delete_event").all()
        assert len(audits) == 1

        receipts = db.query(ActionReceipt).filter_by(action_code="delete_event").all()
        assert len(receipts) == 1
