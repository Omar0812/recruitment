"""test_audit_log.py — log_audit 写入完整性测试。"""
from __future__ import annotations

from app.engine.audit import log_audit
from app.models.audit_log import AuditLog


class TestLogAudit:
    def test_writes_complete_record(self, db):
        details = {"name": {"before": "张三", "after": "李四"}}
        record = log_audit(
            db,
            actor_type="human",
            action_code="update_candidate",
            target_type="candidate",
            target_id=42,
            details=details,
        )
        db.flush()

        assert record.id is not None
        assert record.actor_type == "human"
        assert record.action_code == "update_candidate"
        assert record.target_type == "candidate"
        assert record.target_id == 42
        assert record.details == details
        assert record.created_at is not None

    def test_details_optional(self, db):
        record = log_audit(
            db,
            actor_type="system",
            action_code="delete_term",
            target_type="term",
            target_id=7,
        )
        db.flush()

        assert record.details is None

    def test_multiple_audit_logs(self, db):
        log_audit(db, actor_type="human", action_code="create_job",
                  target_type="job", target_id=1)
        log_audit(db, actor_type="human", action_code="update_job",
                  target_type="job", target_id=1, details={"title": {"before": "A", "after": "B"}})
        db.flush()

        count = db.query(AuditLog).filter_by(target_type="job", target_id=1).count()
        assert count == 2
