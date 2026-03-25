"""今日简报聚合查询（脉搏 + 日程 + 待办 + 关注）"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.application import Application
from app.models.enums import ApplicationState, EventType
from app.models.legacy import Candidate, Job
from app.utils.time import BIZ_TZ, ensure_utc_aware


# ── 工具函数 ──────────────────────────────────────────────────

def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        s = str(value)
        if "T" in s or " " in s:
            return datetime.fromisoformat(s).date()
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


def _days_since(ref: date, today: date) -> int:
    return max((today - ref).days, 0)


def _last_event(events: list, etype: str):
    for ev in reversed(events):
        if ev.type == etype:
            return ev
    return None


_PRIORITY_RANK = {"high": 0, "low": 2}


def _priority_rank(p: str | None) -> int:
    return _PRIORITY_RANK.get(p, 1)  # medium / None → 1


# ── 日程 ─────────────────────────────────────────────────────

def _pending_interviews(app, target: date) -> list[dict]:
    """target 日期的待完成面试。"""
    results = []
    events = list(app.events)
    for ev in events:
        if ev.type != EventType.INTERVIEW_SCHEDULED.value:
            continue
        payload = ev.payload or {}
        scheduled_at = _parse_datetime(payload.get("scheduled_at"))
        if not scheduled_at or ensure_utc_aware(scheduled_at).astimezone(BIZ_TZ).date() != target:
            continue
        # 该面试后有 feedback → 已完成
        if any(
            e.type == EventType.INTERVIEW_FEEDBACK.value
            and e.occurred_at > ev.occurred_at
            for e in events
        ):
            continue
        results.append({
            "type": "interview",
            "application_id": app.id,
            "candidate_id": app.candidate.id,
            "candidate_name": app.candidate.name,
            "job_id": app.job.id,
            "job_title": app.job.title,
            "scheduled_at": scheduled_at.isoformat(),
            "interview_round": payload.get("interview_round"),
            "interviewer": payload.get("interviewer"),
            "meeting_type": payload.get("meeting_type"),
        })
    return results


def _onboard_items(app, target: date) -> list[dict]:
    """target 日期的入职条目。"""
    offer_ev = _last_event(list(app.events), EventType.OFFER_RECORDED.value)
    if not offer_ev:
        return []
    onboard_date = _parse_date((offer_ev.payload or {}).get("onboard_date"))
    if not onboard_date or onboard_date != target:
        return []
    # 已确认入职 → 不再展示
    if _last_event(list(app.events), EventType.HIRE_CONFIRMED.value):
        return []
    return [{
        "type": "onboard",
        "application_id": app.id,
        "candidate_id": app.candidate.id,
        "candidate_name": app.candidate.name,
        "job_id": app.job.id,
        "job_title": app.job.title,
        "onboard_date": onboard_date.isoformat(),
    }]


def _build_schedule(active_apps, today: date, tomorrow: date):
    schedule_today: list[dict] = []
    schedule_tomorrow: list[dict] = []
    today_app_ids: set[int] = set()

    for app in active_apps:
        ti = _pending_interviews(app, today)
        to = _onboard_items(app, today)
        if ti or to:
            schedule_today.extend(ti)
            schedule_today.extend(to)
            today_app_ids.add(app.id)
        schedule_tomorrow.extend(_pending_interviews(app, tomorrow))
        schedule_tomorrow.extend(_onboard_items(app, tomorrow))

    def _sort_key(item):
        return item.get("scheduled_at") or item.get("onboard_date") or ""

    schedule_today.sort(key=_sort_key)
    schedule_tomorrow.sort(key=_sort_key)
    return schedule_today, schedule_tomorrow, today_app_ids


# ── 待办 ─────────────────────────────────────────────────────

def _build_todos(db: Session, active_apps, exclude_app_ids: set[int], today: date):
    todos: list[dict] = []
    todo_app_ids: set[int] = set()

    # 1. 待分配：有候选人无 Application
    unassigned = (
        db.query(Candidate)
        .outerjoin(Application, Candidate.id == Application.candidate_id)
        .filter(
            Application.id == None,           # noqa: E711
            Candidate.deleted_at == None,      # noqa: E711
            Candidate.merged_into == None,     # noqa: E711
        )
        .all()
    )
    if unassigned:
        items = []
        for c in unassigned:
            d = _days_since(c.created_at.date(), today) if c.created_at else 0
            items.append({
                "candidate_id": c.id,
                "candidate_name": c.name,
                "days": d,
                "time_label": f"导入 {d} 天",
            })
        items.sort(key=lambda x: -x["days"])
        todos.append({"type": "unassigned", "label": "待分配",
                       "items": items, "max_days": items[0]["days"]})

    # 2-7: 按 Application 分类
    screening: list[dict] = []
    feedback: list[dict] = []
    arrange: list[dict] = []
    background: list[dict] = []
    offer: list[dict] = []
    onboard: list[dict] = []

    for app in active_apps:
        if app.id in exclude_app_ids:
            continue
        events = list(app.events)
        stage = app.stage
        base = {
            "application_id": app.id,
            "candidate_id": app.candidate.id,
            "candidate_name": app.candidate.name,
            "job_id": app.job.id,
            "job_title": app.job.title,
            "job_priority": app.job.priority,
        }

        if stage == "新申请":
            created = _last_event(events, EventType.APPLICATION_CREATED.value)
            d = _days_since(created.occurred_at.date(), today) if created else 0
            screening.append({**base, "days": d, "time_label": f"等待 {d} 天"})
            todo_app_ids.add(app.id)

        elif stage == "简历筛选":
            assigned = _last_event(events, EventType.SCREENING_ASSIGNED.value)
            d = _days_since(assigned.occurred_at.date(), today) if assigned else 0
            screening.append({**base, "days": d, "time_label": f"等待 {d} 天"})
            todo_app_ids.add(app.id)

        elif stage == "面试":
            last_sched = _last_event(events, EventType.INTERVIEW_SCHEDULED.value)
            last_fb = _last_event(events, EventType.INTERVIEW_FEEDBACK.value)

            if last_sched:
                sched_at = _parse_datetime((last_sched.payload or {}).get("scheduled_at"))
                has_fb = last_fb and last_fb.occurred_at > last_sched.occurred_at

                if sched_at and sched_at.date() < today and not has_fb:
                    # 待面评
                    d = _days_since(sched_at.date(), today)
                    feedback.append({
                        **base, "days": d,
                        "interview_round": (last_sched.payload or {}).get("interview_round"),
                        "time_label": f"面试于 {d} 天前",
                    })
                    todo_app_ids.add(app.id)
                elif has_fb and (last_fb.payload or {}).get("result") == "pass":
                    # 待安排
                    has_next = any(
                        e.type in (EventType.INTERVIEW_SCHEDULED.value,
                                   EventType.ADVANCE_TO_OFFER.value)
                        and e.occurred_at > last_fb.occurred_at
                        for e in events
                    )
                    if not has_next:
                        d = _days_since(last_fb.occurred_at.date(), today)
                        arrange.append({**base, "days": d, "time_label": f"等待 {d} 天"})
                        todo_app_ids.add(app.id)

        elif stage == "背调":
            bg_result = _last_event(events, EventType.BACKGROUND_CHECK_RESULT.value)
            if not bg_result:
                # 待记录背调
                bg_start = _last_event(events, EventType.START_BACKGROUND_CHECK.value)
                d = _days_since(bg_start.occurred_at.date(), today) if bg_start else 0
                background.append({**base, "days": d, "time_label": f"发起 {d} 天"})
                todo_app_ids.add(app.id)
            elif (bg_result.payload or {}).get("result") == "pass":
                # 待发 Offer
                if not _last_event(events, EventType.OFFER_RECORDED.value):
                    d = _days_since(bg_result.occurred_at.date(), today)
                    offer.append({**base, "days": d, "time_label": f"等待 {d} 天"})
                    todo_app_ids.add(app.id)

        elif stage == "待入职":
            offer_ev = _last_event(events, EventType.OFFER_RECORDED.value)
            if offer_ev:
                od = _parse_date((offer_ev.payload or {}).get("onboard_date"))
                if od and od < today:
                    d = _days_since(od, today)
                    onboard.append({**base, "days": d, "time_label": f"入职日期 {d} 天前"})
                    todo_app_ids.add(app.id)

    # 组装 + 排序
    def _sort_items(items):
        items.sort(key=lambda x: (_priority_rank(x.get("job_priority")), -x["days"]))

    groups = [
        ("screening", "待筛选", screening),
        ("feedback", "待面评", feedback),
        ("arrange", "待安排", arrange),
        ("background", "待记录背调", background),
        ("offer", "待发Offer", offer),
        ("onboard", "待确认入职", onboard),
    ]
    for type_key, label, items in groups:
        if items:
            _sort_items(items)
            todos.append({"type": type_key, "label": label,
                           "items": items, "max_days": max(i["days"] for i in items)})

    # 组间排序：等得最久的组排最上面
    todos.sort(key=lambda g: -g["max_days"])
    return todos, todo_app_ids


# ── 关注 ─────────────────────────────────────────────────────

_SEVERITY = {
    "no_candidates_deadline": 0,
    "deadline": 1,
    "no_candidates": 2,
    "empty_front": 3,
    "no_contact": 4,
    "filled": 5,
}


def _build_focus(db: Session, active_apps, todo_app_ids: set[int], today: date):
    focus: list[dict] = []

    # ── 岗位级信号 ──
    open_jobs = db.query(Job).filter(Job.status == "open").all()

    # 一次 GROUP BY 查询所有岗位的 hired count，替代循环内逐个查询
    hired_rows = (
        db.query(Application.job_id, func.count(Application.id))
        .filter(Application.state == ApplicationState.HIRED.value)
        .group_by(Application.job_id)
        .all()
    )
    hired_map: dict[int, int] = {job_id: cnt for job_id, cnt in hired_rows}

    for job in open_jobs:
        signals: list[str] = []
        severity = 99

        # 该岗位的活跃 Application
        job_apps = [a for a in active_apps if a.job_id == job.id]
        active_count = len(job_apps)
        hired_count = hired_map.get(job.id, 0)

        job_age = _days_since(job.created_at.date(), today) if job.created_at else 0
        front_stages = {"新申请", "简历筛选", "面试"}
        front_count = sum(1 for a in job_apps if a.stage in front_stages)
        back_count = active_count - front_count

        # 无候选人
        no_cand = job_age > 7 and active_count == 0
        # Deadline 临近
        deadline_near = False
        deadline_days = None
        if job.target_onboard_date:
            deadline_days = (job.target_onboard_date - today).days
            deadline_near = deadline_days <= 14 and hired_count < job.headcount
        # 招满待关闭
        filled = hired_count >= job.headcount
        # 前段管道空
        empty_front = front_count == 0 and back_count > 0

        if no_cand and deadline_near:
            signals.extend(["无候选人", f"deadline {deadline_days} 天"])
            severity = min(severity, _SEVERITY["no_candidates_deadline"])
        else:
            if deadline_near:
                signals.append(f"deadline {deadline_days} 天")
                severity = min(severity, _SEVERITY["deadline"])
            if no_cand:
                signals.append("无候选人")
                severity = min(severity, _SEVERITY["no_candidates"])
            if empty_front:
                signals.append("前段管道已空")
                severity = min(severity, _SEVERITY["empty_front"])
            if filled:
                signals.append("已满，是否关闭？")
                severity = min(severity, _SEVERITY["filled"])

        if signals:
            focus.append({
                "entity": "job",
                "job_id": job.id,
                "job_title": job.title,
                "department": job.department,
                "priority": job.priority,
                "signals": signals,
                "severity": severity,
                "hired_count": hired_count,
                "headcount": job.headcount,
            })

    # ── 候选人级信号：久未联系 ──
    for app in active_apps:
        if app.id in todo_app_ids:
            continue
        if app.stage not in ("Offer沟通", "待入职"):
            continue
        events = list(app.events)
        if not events:
            continue
        last_ev = events[-1]  # events 按 occurred_at 正序
        days_silent = _days_since(last_ev.occurred_at.date(), today)
        if days_silent > 7:
            focus.append({
                "entity": "candidate",
                "application_id": app.id,
                "candidate_id": app.candidate.id,
                "candidate_name": app.candidate.name,
                "job_id": app.job.id,
                "job_title": app.job.title,
                "stage": app.stage,
                "days_silent": days_silent,
                "signals": [f"{days_silent} 天未联系"],
                "severity": _SEVERITY["no_contact"],
                "priority": app.job.priority,
            })

    # 排序：severity → 高优岗位优先
    focus.sort(key=lambda x: (x["severity"], _priority_rank(x.get("priority"))))
    return focus


# ── 入口 ─────────────────────────────────────────────────────

def get_today_briefing(db: Session) -> dict:
    today = datetime.now(timezone.utc).astimezone(BIZ_TZ).date()
    tomorrow = today + timedelta(days=1)

    # 加载所有活跃 Application（含 events / candidate / job）
    active_apps = (
        db.query(Application)
        .filter(Application.state == ApplicationState.IN_PROGRESS.value)
        .options(
            joinedload(Application.events),
            joinedload(Application.candidate),
            joinedload(Application.job),
        )
        .all()
    )

    schedule_today, schedule_tomorrow, sched_app_ids = _build_schedule(
        active_apps, today, tomorrow,
    )
    todos, todo_app_ids = _build_todos(db, active_apps, sched_app_ids, today)
    focus = _build_focus(db, active_apps, todo_app_ids, today)

    today_interviews = sum(1 for s in schedule_today if s["type"] == "interview")
    todo_count = sum(len(g["items"]) for g in todos)
    open_jobs = db.query(func.count(Job.id)).filter(Job.status == "open").scalar()

    return {
        "pulse": {
            "today_interviews": today_interviews,
            "todo_count": todo_count,
            "active_applications": len(active_apps),
            "open_jobs": open_jobs,
        },
        "schedule": {
            "today": schedule_today,
            "tomorrow": schedule_tomorrow,
        },
        "todos": todos,
        "focus": focus,
    }
