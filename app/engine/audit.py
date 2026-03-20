"""audit_logs 统一写入入口。

任何需要写 audit_logs 的代码 MUST 通过 log_audit() 函数，
不允许直接构造 AuditLog 对象。
"""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    *,
    actor_type: str,
    action_code: str,
    target_type: str,
    target_id: int,
    actor_id: int | None = None,
    details: Optional[dict[str, Any]] = None,
) -> AuditLog:
    """写入一条 audit_log 记录并返回。"""
    record = AuditLog(
        actor_type=actor_type,
        action_code=action_code,
        target_type=target_type,
        target_id=target_id,
        actor_id=actor_id,
        details=details,
    )
    db.add(record)
    return record
