"""原语注册表：action_code -> (guard, handler) 映射。"""
from __future__ import annotations

from typing import Any, Callable, NamedTuple

from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.event import Event


GuardFn = Callable[[Application, dict[str, Any]], None]
HandlerFn = Callable[[Session, Application, dict[str, Any], str], Event]


class ActionDef(NamedTuple):
    guard: GuardFn
    handler: HandlerFn
    target_type: str


_REGISTRY: dict[str, ActionDef] = {}


def register(
    action_code: str,
    *,
    guard: GuardFn,
    handler: HandlerFn,
    target_type: str = "application",
) -> None:
    _REGISTRY[action_code] = ActionDef(
        guard=guard, handler=handler, target_type=target_type,
    )


def get(action_code: str) -> ActionDef:
    if action_code not in _REGISTRY:
        raise BusinessError(
            "unknown_action", f"未知动作：{action_code}",
        )
    return _REGISTRY[action_code]


def all_codes() -> list[str]:
    return list(_REGISTRY.keys())


# 避免循环导入：在此处 import BusinessError
from app.engine.errors import BusinessError  # noqa: E402
