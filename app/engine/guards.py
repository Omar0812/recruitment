"""状态守卫：集中管理 Action 前置条件校验。

每个 guard 签名统一为 guard(application, payload) -> None。
校验不通过抛 BusinessError。
"""
from __future__ import annotations

from app.engine.errors import BusinessError
from app.models.enums import ApplicationState, EventType


# ── 通用守卫 ──────────────────────────────────────────────

def require_active(application) -> None:
    """Application 必须处于 IN_PROGRESS 状态。"""
    if application.state != ApplicationState.IN_PROGRESS.value:
        raise BusinessError("application_not_active", "流程已结束，无法推进")


def require_event_exists(application, event_type: str, label: str) -> None:
    """Application 时间线中必须已存在指定类型的 Event。"""
    for ev in application.events:
        if ev.type == event_type:
            return
    raise BusinessError("stage_prerequisite_missing", f"需要先完成「{label}」")


def require_latest_event_payload(
    application,
    event_type: str,
    field: str,
    expected: str,
    label: str,
) -> None:
    """从 Event 链逆序查找指定类型的最新 Event，检查 payload[field] == expected。"""
    for ev in reversed(application.events):
        if ev.type == event_type:
            value = (ev.payload or {}).get(field)
            if value == expected:
                return
            raise BusinessError(
                "stage_prerequisite_missing",
                f"需要{label}",
            )
    raise BusinessError("stage_prerequisite_missing", f"需要先完成相关操作才能{label}")


# ── 各 Action 的 Guard ────────────────────────────────────

def guard_application_created(application, payload: dict) -> None:
    """创建 Application：调用方需确保无活跃流程（DB 唯一索引兜底）。"""
    pass


def guard_screening_passed(application, payload: dict) -> None:
    require_active(application)


def guard_interview_scheduled(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.SCREENING_PASSED.value, "简历筛选通过",
    )


def guard_interview_feedback(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.SCREENING_PASSED.value, "简历筛选通过",
    )
    require_event_exists(
        application, EventType.INTERVIEW_SCHEDULED.value, "安排面试",
    )


def guard_advance_to_offer(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.SCREENING_PASSED.value, "简历筛选通过",
    )
    require_latest_event_payload(
        application,
        EventType.INTERVIEW_FEEDBACK.value,
        "conclusion",
        "pass",
        "面评通过才能发起 Offer",
    )


def guard_start_background_check(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.ADVANCE_TO_OFFER.value, "进入 Offer 沟通",
    )


def guard_background_check_result(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.START_BACKGROUND_CHECK.value, "开始背调",
    )


def guard_offer_recorded(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.ADVANCE_TO_OFFER.value, "进入 Offer 沟通",
    )
    require_latest_event_payload(
        application,
        EventType.BACKGROUND_CHECK_RESULT.value,
        "result",
        "pass",
        "背调通过才能记录 Offer",
    )


def guard_hire_confirmed(application, payload: dict) -> None:
    require_active(application)
    require_event_exists(
        application, EventType.OFFER_RECORDED.value, "记录 Offer",
    )


def guard_application_ended(application, payload: dict) -> None:
    require_active(application)


def guard_left_recorded(application, payload: dict) -> None:
    """离职记录：仅 HIRED 状态可执行。"""
    if application.state != ApplicationState.HIRED.value:
        raise BusinessError("not_hired", "只有已入职的候选人才能记录离职")


def guard_note(application, payload: dict) -> None:
    """备注：任何状态的 Application 都可以写。"""
    pass


# ── Event 编辑/删除 Guard ──────────────────────────────────

def guard_edit_event(application, payload: dict) -> None:
    """编辑 Event：Application 必须活跃。"""
    require_active(application)


def guard_delete_event(application, payload: dict) -> None:
    """删除 Event：Application 活跃 + 只能删尾部 + 首条不可删。"""
    require_active(application)

    events = sorted(application.events, key=lambda e: e.occurred_at)
    if not events:
        raise BusinessError("no_events", "时间线为空，无可删除的 Event")

    event_id = (payload or {}).get("event_id")
    if event_id is None:
        raise BusinessError("missing_event_id", "payload 缺少 event_id")

    target_event = None
    for ev in events:
        if ev.id == event_id:
            target_event = ev
            break
    if target_event is None:
        raise BusinessError("event_not_found", "指定 Event 不存在于该 Application")

    if target_event.type == EventType.APPLICATION_CREATED.value:
        raise BusinessError("cannot_delete_first_event", "首条 Event 不可删除")

    tail = events[-1]
    if target_event.id != tail.id:
        raise BusinessError("not_tail_event", "只能删除时间线尾部 Event")
