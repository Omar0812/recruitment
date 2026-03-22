"""Stage 派生：从 Application 的 Event 时间线计算当前阶段。

规则（data-model.md § 3.3）：
- 仅 6 种「Stage 推进类」EventType 触发阶段跳转
- 取时间线中最后一个触发跳转的 Event，对应当前 Stage
- 阶段内记录类 / 生命周期类 / 自由记录类不影响 Stage
"""
from __future__ import annotations

from app.models.enums import EventType

# EventType.value -> Stage 名称
STAGE_MAP: dict[str, str] = {
    EventType.APPLICATION_CREATED.value: "简历筛选",
    EventType.SCREENING_PASSED.value: "面试",
    EventType.ADVANCE_TO_OFFER.value: "Offer沟通",
    EventType.START_BACKGROUND_CHECK.value: "背调",
    EventType.OFFER_RECORDED.value: "待入职",
    EventType.HIRE_CONFIRMED.value: "已入职",
}


def derive(application) -> str | None:
    """从 Event 链逆序扫描，返回当前 Stage。

    application.events 已按 occurred_at 正序排列（model relationship）。
    返回 None 表示无法派生（不应出现，因为首条一定是 application_created）。
    """
    for event in reversed(application.events):
        stage = STAGE_MAP.get(event.type)
        if stage is not None:
            return stage
    return None
