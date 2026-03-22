"""test_entity_writer.py — 三轨分流 + 幂等回放 + 失败 receipt。"""
from __future__ import annotations

import uuid

from app.engine import entity_writer
from app.engine.errors import BusinessError
from app.models.action_receipt import ActionReceipt
from app.models.audit_log import AuditLog
from app.models.event import Event


def _uid() -> str:
    return str(uuid.uuid4())


class TestEntityWriterSuccess:
    def test_writes_audit_log_and_receipt(self, db):
        receipt = entity_writer.write(
            db,
            action_code="create_job",
            target_type="job",
            target_id=1,
            actor_type="human",
            command_id=_uid(),
            details={"title": "后端工程师"},
        )
        assert receipt.ok is True
        assert receipt.action_code == "create_job"
        assert receipt.target_type == "job"

        audit = db.query(AuditLog).filter_by(
            action_code="create_job", target_type="job",
        ).first()
        assert audit is not None
        assert audit.details == {"title": "后端工程师"}

    def test_does_not_write_events(self, db):
        entity_writer.write(
            db,
            action_code="update_candidate",
            target_type="candidate",
            target_id=1,
            actor_type="human",
            command_id=_uid(),
        )
        events = db.query(Event).all()
        assert len(events) == 0

    def test_mutate_callback_executed(self, db):
        results = []

        def my_mutate(session):
            results.append("executed")

        entity_writer.write(
            db,
            action_code="update_supplier",
            target_type="supplier",
            target_id=5,
            actor_type="human",
            command_id=_uid(),
            mutate=my_mutate,
        )
        assert results == ["executed"]


class TestEntityWriterIdempotency:
    def test_same_command_id_returns_same_receipt(self, db):
        cmd = _uid()
        r1 = entity_writer.write(
            db, action_code="create_job", target_type="job",
            target_id=1, actor_type="human", command_id=cmd,
        )
        r2 = entity_writer.write(
            db, action_code="create_job", target_type="job",
            target_id=1, actor_type="human", command_id=cmd,
        )
        assert r1.id == r2.id

        count = db.query(AuditLog).filter_by(action_code="create_job").count()
        assert count == 1


class TestEntityWriterFailure:
    def test_business_error_writes_failed_receipt(self, db):
        def failing_mutate(session):
            raise BusinessError("invalid_data", "数据不合法")

        receipt = entity_writer.write(
            db,
            action_code="update_candidate",
            target_type="candidate",
            target_id=1,
            actor_type="human",
            command_id=_uid(),
            mutate=failing_mutate,
        )
        assert receipt.ok is False
        assert receipt.error_code == "invalid_data"
        assert receipt.error_message == "数据不合法"
