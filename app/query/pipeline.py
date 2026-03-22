"""Pipeline query helpers: batch event summaries."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.event import Event


# 面试轮次中文标签
_ROUND_LABELS = ["一面", "二面", "三面", "四面", "五面"]


def _round_label(n: int) -> str:
    """第 n 轮面试的标签（1-indexed）。"""
    if 1 <= n <= len(_ROUND_LABELS):
        return _ROUND_LABELS[n - 1]
    return f"{n}面"


def get_event_summaries(
    db: Session,
    application_ids: list[int],
) -> dict[int, dict]:
    """批量计算多个 Application 的事件摘要。

    返回 {application_id: {stage_detail, next_interview_at, has_pending_feedback}}
    与前端 computeEventSummary() 逻辑一致。
    """
    if not application_ids:
        return {}

    # 一次查询所有相关 events
    events = (
        db.query(Event)
        .filter(Event.application_id.in_(application_ids))
        .order_by(Event.application_id, Event.occurred_at)
        .all()
    )

    # 按 application_id 分组
    grouped: dict[int, list[Event]] = {}
    for e in events:
        grouped.setdefault(e.application_id, []).append(e)

    # 查 stage 信息（从 applications 表）
    from app.models.application import Application

    apps = (
        db.query(Application.id, Application.stage)
        .filter(Application.id.in_(application_ids))
        .all()
    )
    stage_map = {a.id: a.stage for a in apps}

    now = datetime.now(timezone.utc)
    result: dict[int, dict] = {}

    for app_id in application_ids:
        app_events = grouped.get(app_id, [])
        stage = stage_map.get(app_id, "")

        scheduled = [e for e in app_events if e.type == "interview_scheduled"]
        feedbacks = [e for e in app_events if e.type == "interview_feedback"]

        round_count = len(scheduled)
        feedback_count = len(feedbacks)

        # 判断是否有未完成面评的面试
        pending_interview = scheduled[-1] if round_count > feedback_count else None
        pending_scheduled_at = (
            pending_interview.payload.get("scheduled_at")
            if pending_interview and pending_interview.payload
            else None
        )
        has_pending_feedback = False
        if pending_scheduled_at:
            try:
                scheduled_time = datetime.fromisoformat(
                    pending_scheduled_at.replace("Z", "+00:00")
                )
                has_pending_feedback = scheduled_time < now
            except (ValueError, TypeError):
                pass

        # 阶段细节
        stage_detail = stage or ""
        if stage == "面试":
            label = _round_label(max(round_count, 1))
            if round_count > feedback_count:
                if has_pending_feedback:
                    stage_detail = f"{label}待面评"
                else:
                    stage_detail = f"{label}安排中"
            elif feedback_count > 0:
                last_feedback = feedbacks[-1]
                conclusion = (
                    last_feedback.payload.get("conclusion")
                    if last_feedback.payload
                    else None
                )
                stage_detail = (
                    f"{label}通过" if conclusion == "pass" else f"{label}淘汰"
                )
            else:
                stage_detail = "面试"

        # next_interview_at
        next_interview_at = None
        if round_count > feedback_count and pending_scheduled_at:
            next_interview_at = pending_scheduled_at

        result[app_id] = {
            "stage_detail": stage_detail,
            "next_interview_at": next_interview_at,
            "has_pending_feedback": has_pending_feedback,
        }

    return result
