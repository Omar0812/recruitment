"""test_events.py — PUT /events/{id} 更新 + 404 + audit_log。"""
from __future__ import annotations

from app.engine.executor import execute
from app.models.audit_log import AuditLog
from app.models.enums import ActorType
from app.models.event import Event


class TestUpdateEvent:
    def test_update_payload_merges(self, client, db, seed):
        a = seed["application"]
        # pass_screening 以产生一个带 payload 的 event
        execute(
            db, action_code="pass_screening", application=a,
            payload={}, actor_type=ActorType.HUMAN.value,
            command_id=seed["uid"](),
        )
        # schedule_interview 产生面试事件
        execute(
            db, action_code="schedule_interview", application=a,
            payload={"scheduled_at": "2026-03-15T10:00", "interviewer": "王总"},
            actor_type=ActorType.HUMAN.value,
            command_id=seed["uid"](),
        )
        db.expire(a, ["events"])
        events = sorted(a.events, key=lambda e: e.occurred_at)
        interview_event = events[-1]

        resp = client.put(
            f"/api/v1/events/{interview_event.id}",
            json={"payload": {"interviewer": "李总", "location": "会议室A"}, "version": interview_event.version},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["payload"]["interviewer"] == "李总"
        assert data["payload"]["location"] == "会议室A"
        # 原有字段保留
        assert data["payload"]["scheduled_at"] == "2026-03-15T10:00"

    def test_update_body(self, client, db, seed):
        a = seed["application"]
        execute(
            db, action_code="add_note", application=a,
            payload={"body": "原始备注"},
            actor_type=ActorType.HUMAN.value,
            command_id=seed["uid"](),
        )
        db.expire(a, ["events"])
        events = sorted(a.events, key=lambda e: e.occurred_at)
        note_event = events[-1]

        resp = client.put(
            f"/api/v1/events/{note_event.id}",
            json={"body": "修改后的备注", "version": note_event.version},
        )
        assert resp.status_code == 200
        assert resp.json()["body"] == "修改后的备注"

    def test_update_writes_audit_log(self, client, db, seed):
        a = seed["application"]
        execute(
            db, action_code="add_note", application=a,
            payload={"body": "审计测试"},
            actor_type=ActorType.HUMAN.value,
            command_id=seed["uid"](),
        )
        db.expire(a, ["events"])
        events = sorted(a.events, key=lambda e: e.occurred_at)
        note_event = events[-1]

        # 清除之前的 audit logs
        db.query(AuditLog).filter_by(action_code="edit_event").delete()
        db.flush()

        client.put(
            f"/api/v1/events/{note_event.id}",
            json={"body": "审计修改", "version": note_event.version},
        )

        audit = db.query(AuditLog).filter_by(action_code="edit_event").first()
        assert audit is not None
        assert audit.details["event_id"] == note_event.id
        assert "changes" in audit.details

    def test_update_nonexistent_returns_404(self, client):
        resp = client.put("/api/v1/events/999999", json={"body": "不存在"})
        assert resp.status_code == 404
