"""actions 子包初始化：导入模块以触发 register()。"""
from __future__ import annotations

from app.engine.actions import application_advance  # noqa: F401
from app.engine.actions import application_lifecycle  # noqa: F401
from app.engine.actions import event_record  # noqa: F401
from app.engine.actions import event_mutation  # noqa: F401
