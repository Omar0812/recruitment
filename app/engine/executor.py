from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session

# 触发 actions 模块导入，从而完成 register()
from app.engine.actions import __init__ as _actions_init  # noqa: F401
from app.engine.errors import BusinessError
from app.engine.registry import get
from app.engine.stage import derive
from app.models.action_receipt import ActionReceipt
from app.models.application import Application
from app.models.event import Event


def execute(
    db: Session,
    *,
    action_code: str,
    application: Application,
    payload: dict[str, Any] | None,
    actor_type: str,
    actor_id: int | None = None,
    command_id: str,
) -> ActionReceipt:
    """统一执行入口（幂等 + guard + action + stage + receipt）。"""
    data = payload or {}

    # 1) 幂等回放
    existing = db.query(ActionReceipt).filter_by(command_id=command_id).first()
    if existing is not None:
        return existing

    # 2) 查注册表
    action_def = get(action_code)

    state_before = application.state
    stage_before = application.stage

    # 3) guard
    try:
        action_def.guard(application, data)
    except BusinessError as exc:
        receipt = ActionReceipt(
            command_id=command_id,
            action_code=action_code,
            target_type=action_def.target_type,
            target_id=application.id,
            ok=False,
            state_before=state_before,
            state_after=application.state,
            stage_before=stage_before,
            stage_after=application.stage,
            error_code=exc.code,
            error_message=exc.message,
        )
        db.add(receipt)
        db.commit()
        return receipt

    # 4) 执行动作（写 Event / 可能更新 state/outcome）
    result = action_def.handler(db, application, data, actor_type, actor_id)

    # 收集本次新建的 event（pending = 刚 db.add 尚未 flush，排除 edit/delete 返回的已有 event）
    is_new_event = isinstance(result, Event) and sa_inspect(result).pending

    # 5) stage 派生（基于最新事件链）
    db.flush()

    created_event_ids: list[int] = []
    if is_new_event and result.id is not None:
        created_event_ids.append(result.id)

    # application.events 可能已在会话里缓存，需先失效再重算
    db.expire(application, ["events"])
    application.stage = derive(application)

    # 6) 成功 receipt
    receipt = ActionReceipt(
        command_id=command_id,
        action_code=action_code,
        target_type=action_def.target_type,
        target_id=application.id,
        ok=True,
        state_before=state_before,
        state_after=application.state,
        stage_before=stage_before,
        stage_after=application.stage,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    receipt._event_ids = created_event_ids
    return receipt
