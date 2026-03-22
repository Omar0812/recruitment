"""test_event_mutation.py — 编辑留痕 + 删除留痕 + stage 回退 + guard 拒绝路径。"""
from __future__ import annotations

import uuid

from app.engine.executor import execute
from app.models.action_receipt import ActionReceipt
from app.models.audit_log import AuditLog
from app.models.enums import ActorType, ApplicationState, EventType
from app.models.event import Event


def _uid() -> str:
    return str(uuid.uuid4())


class TestEditEvent:
    def test_edit_payload_succeeds(self, db, app_with_events):
        a = app_with_events["application"]
        events = sorted(a.events, key=lambda e: e.occurred_at)
        target = events[-1]  # screening_passed

        receipt = execute(
            db, action_code="edit_event", application=a,
            payload={
                "event_id": target.id,
                "new_payload": {"note": "补充信息"},
            },
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert receipt.ok is True

        db.refresh(target)
        assert target.payload == {"note": "补充信息"}

        audit = db.query(AuditLog).filter_by(action_code="edit_event").first()
        assert audit is not None
        assert audit.details["event_id"] == target.id
        assert "changes" in audit.details

    def test_edit_body_succeeds(self, db, app_with_events):
        a = app_with_events["application"]
        # add a note event
        execute(
            db, action_code="add_note", application=a,
            payload={"body": "初始备注"},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        db.expire(a, ["events"])
        events = sorted(a.events, key=lambda e: e.occurred_at)
        note_event = events[-1]

        receipt = execute(
            db, action_code="edit_event", application=a,
            payload={"event_id": note_event.id, "new_body": "修改后的备注"},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert receipt.ok is True
        db.refresh(note_event)
        assert note_event.body == "修改后的备注"

    def test_edit_event_stage_unchanged(self, db, app_with_events):
        a = app_with_events["application"]
        assert a.stage == "面试"

        events = sorted(a.events, key=lambda e: e.occurred_at)
        target = events[-1]
        execute(
            db, action_code="edit_event", application=a,
            payload={"event_id": target.id, "new_payload": {"extra": True}},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert a.stage == "面试"


class TestDeleteEvent:
    def test_delete_tail_succeeds(self, db, app_with_events):
        a = app_with_events["application"]
        events = sorted(a.events, key=lambda e: e.occurred_at)
        tail = events[-1]  # screening_passed
        tail_id = tail.id

        receipt = execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": tail_id},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert receipt.ok is True

        deleted = db.query(Event).filter_by(id=tail_id).first()
        assert deleted is None

        audit = db.query(AuditLog).filter_by(action_code="delete_event").first()
        assert audit is not None
        assert audit.details["deleted_event"]["id"] == tail_id

    def test_delete_tail_stage_rollback(self, db, app_with_events):
        a = app_with_events["application"]
        assert a.stage == "面试"

        events = sorted(a.events, key=lambda e: e.occurred_at)
        tail = events[-1]

        execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": tail.id},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert a.stage == "简历筛选"


class TestDeleteEventGuardRejection:
    def test_delete_first_event_rejected(self, db, app_with_events):
        a = app_with_events["application"]
        events = sorted(a.events, key=lambda e: e.occurred_at)
        first = events[0]  # application_created

        # 先删 screening_passed（尾部），让 application_created 成为唯一事件
        tail = events[-1]
        execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": tail.id},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        db.expire(a, ["events"])

        receipt = execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": first.id},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert receipt.ok is False
        assert receipt.error_code == "cannot_delete_first_event"

    def test_delete_non_tail_rejected(self, db, app_with_events):
        a = app_with_events["application"]
        # 加一条 note，使时间线有 3 条 event
        execute(
            db, action_code="add_note", application=a,
            payload={"body": "test"}, actor_type="human", command_id=_uid(),
        )
        db.expire(a, ["events"])
        events = sorted(a.events, key=lambda e: e.occurred_at)
        middle = events[1]  # screening_passed（非首、非尾）

        receipt = execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": middle.id},
            actor_type=ActorType.HUMAN.value, command_id=_uid(),
        )
        assert receipt.ok is False
        assert receipt.error_code == "not_tail_event"

    def test_delete_on_ended_application_rejected(self, db, app_with_events):
        a = app_with_events["application"]
        execute(
            db, action_code="end_application", application=a,
            payload={"outcome": "rejected"}, actor_type="human", command_id=_uid(),
        )
        db.expire(a, ["events"])
        events = sorted(a.events, key=lambda e: e.occurred_at)
        tail = events[-1]

        receipt = execute(
            db, action_code="delete_event", application=a,
            payload={"event_id": tail.id},
            actor_type="human", command_id=_uid(),
        )
        assert receipt.ok is False
        assert receipt.error_code == "application_not_active"
