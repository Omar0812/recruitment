"""非 Application 对象写入统一入口。

职责：
1) command_id 幂等
2) 执行具体业务写入回调（由调用方提供）
3) 写入 audit_log
4) 写入 action_receipt
5) commit
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from sqlalchemy.orm import Session

from app.engine.audit import log_audit
from app.engine.errors import BusinessError
from app.models.action_receipt import ActionReceipt


MutateFn = Callable[[Session], None]


def write(
    db: Session,
    *,
    action_code: str,
    target_type: str,
    target_id: int,
    actor_type: str,
    actor_id: int | None = None,
    command_id: str,
    details: Optional[dict[str, Any]] = None,
    mutate: Optional[MutateFn] = None,
) -> ActionReceipt:
    """非 Application 对象写入：审计 + 回执统一入口。"""
    existing = db.query(ActionReceipt).filter_by(command_id=command_id).first()
    if existing is not None:
        return existing

    try:
        if mutate is not None:
            mutate(db)

        log_audit(
            db,
            actor_type=actor_type,
            action_code=action_code,
            target_type=target_type,
            target_id=target_id,
            actor_id=actor_id,
            details=details,
        )

        receipt = ActionReceipt(
            command_id=command_id,
            action_code=action_code,
            target_type=target_type,
            target_id=target_id,
            actor_id=actor_id,
            ok=True,
        )
        db.add(receipt)
        db.commit()
        db.refresh(receipt)
        return receipt
    except BusinessError as exc:
        receipt = ActionReceipt(
            command_id=command_id,
            action_code=action_code,
            target_type=target_type,
            target_id=target_id,
            ok=False,
            error_code=exc.code,
            error_message=exc.message,
        )
        db.add(receipt)
        db.commit()
        db.refresh(receipt)
        return receipt
