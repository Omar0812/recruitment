"""分析模块聚合查询 — overview / jobs / channels"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.constants.close_reasons import CLOSE_REASON_LABELS
from app.models.application import Application
from app.models.enums import ApplicationState, EventType, Outcome
from app.models.event import Event
from app.models.expense import Expense
from app.models.legacy import Candidate, Job, Supplier
from app.models.term import Term


# ── 常量 ────────────────────────────────────────────────────

FUNNEL_STAGES = ["简历筛选", "面试", "Offer沟通", "背调", "待入职", "已入职"]
SECTION_LABELS = {
    "headhunter": "猎头",
    "platform": "招聘平台",
    "other": "其他",
}

# stage 的排序权重（越大 = 越深入漏斗）
_STAGE_RANK = {s: i for i, s in enumerate(FUNNEL_STAGES)}

# ── 工具函数 ─────────────────────────────────────────────────

def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _prev_window(start: date, end: date) -> tuple[date, date]:
    """计算环比窗口：取焦点范围前一个同等时长的窗口。"""
    delta = (end - start).days + 1  # 包含两端
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=delta - 1)
    return prev_start, prev_end


def _pct_change(current: float, previous: float) -> float | None:
    """环比变化百分比。previous=0 时返回 None（无法计算）。"""
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def _bucket_date(d: date, granularity: str) -> str:
    """将日期归入粒度桶，返回桶的标签字符串。"""
    if granularity == "day":
        return d.isoformat()
    elif granularity == "week":
        # ISO 周一为周首日
        monday = d - timedelta(days=d.weekday())
        return monday.isoformat()
    elif granularity == "month":
        return f"{d.year}-{d.month:02d}"
    elif granularity == "quarter":
        q = (d.month - 1) // 3 + 1
        return f"{d.year}-Q{q}"
    return d.isoformat()


def _iso_or_none(value: date | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value.isoformat()
    return value


def _delta_value(current: float | int | None, previous: float | int | None) -> float | int | None:
    if current is None or previous is None:
        return None
    diff = current - previous
    if isinstance(diff, float):
        return round(diff, 1)
    return diff


def _latest_offer_payloads(db: Session, application_ids: set[int]) -> dict[int, dict[str, Any]]:
    if not application_ids:
        return {}

    offer_events = (
        db.query(Event)
        .filter(
            Event.type == EventType.OFFER_RECORDED.value,
            Event.application_id.in_(application_ids),
        )
        .order_by(Event.application_id, Event.occurred_at)
        .all()
    )

    latest_payloads: dict[int, dict[str, Any]] = {}
    for event in offer_events:
        latest_payloads[event.application_id] = event.payload or {}
    return latest_payloads


def _headhunter_fees_by_hire_date(
    db: Session,
    start: datetime,
    end: datetime,
) -> dict[int, float]:
    hire_events = (
        db.query(Event)
        .filter(
            Event.type == EventType.HIRE_CONFIRMED.value,
            Event.occurred_at >= start,
            Event.occurred_at <= end,
        )
        .options(joinedload(Event.application).joinedload(Application.candidate))
        .all()
    )

    hired_supplier_app_ids = {
        event.application_id
        for event in hire_events
        if event.application and event.application.candidate and event.application.candidate.supplier_id
    }
    latest_offer_payloads = _latest_offer_payloads(db, hired_supplier_app_ids)
    return {
        application_id: float((latest_offer_payloads.get(application_id) or {}).get("headhunter_fee", 0) or 0)
        for application_id in hired_supplier_app_ids
    }


def _hired_counts_by_job(db: Session, job_ids: list[int]) -> dict[int, int]:
    if not job_ids:
        return {}

    rows = (
        db.query(Application.job_id, func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids),
            Application.state == ApplicationState.HIRED.value,
        )
        .group_by(Application.job_id)
        .all()
    )
    return {job_id: count for job_id, count in rows}


def _get_stage_for_app(app: Application) -> str:
    """获取 Application 在漏斗中的位置。
    活跃的取 current stage；已结束的取终态对应阶段或 stage 字段。"""
    if app.state == ApplicationState.HIRED.value:
        return "已入职"
    # 已结束（REJECTED/WITHDRAWN/LEFT）取 stage 字段（结束时所在阶段）
    return app.stage or "简历筛选"


def _source_tag_lookup(db: Session) -> tuple[dict[str, Term], dict[int, Term]]:
    terms = db.query(Term).filter(Term.type.in_(["platform", "other"])).all()
    by_name = {term.name: term for term in terms}
    by_id = {term.id: term for term in terms}
    return by_name, by_id


def _supplier_name(db: Session, supplier_id: int) -> str:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    return supplier.name if supplier else "未知猎头"


def _channel_meta_for_candidate(
    candidate: Candidate,
    db: Session,
    source_tags_by_name: dict[str, Term] | None = None,
) -> dict[str, str]:
    if candidate.supplier_id:
        return {
            "key": f"supplier:{candidate.supplier_id}",
            "name": _supplier_name(db, candidate.supplier_id),
            "type": "headhunter",
            "section_key": "headhunter",
            "section_label": SECTION_LABELS["headhunter"],
        }

    source = (candidate.source or "").strip()
    if source == "内推":
        return {
            "key": "referral",
            "name": "内推",
            "type": "other",
            "section_key": "other",
            "section_label": SECTION_LABELS["other"],
        }

    source_tags_by_name = source_tags_by_name or _source_tag_lookup(db)[0]
    term = source_tags_by_name.get(source)
    if term:
        section = term.type  # 'platform' or 'other'
        return {
            "key": f"source_tag:{term.id}",
            "name": term.name,
            "type": section,
            "section_key": section,
            "section_label": SECTION_LABELS[section],
        }

    return {
        "key": "other",
        "name": "其他来源",
        "type": "other",
        "section_key": "other",
        "section_label": SECTION_LABELS["other"],
    }


def _channel_key_for_candidate(
    candidate: Candidate,
    db: Session,
    source_tags_by_name: dict[str, Term] | None = None,
) -> str:
    return _channel_meta_for_candidate(candidate, db, source_tags_by_name)["key"]


def _canonical_channel_key(
    channel_key: str,
    db: Session,
    source_tags_by_name: dict[str, Term] | None = None,
) -> str:
    if channel_key in {"referral", "other"}:
        return channel_key
    if channel_key.startswith("supplier:") or channel_key.startswith("source_tag:"):
        return channel_key
    if channel_key.startswith("source:"):
        source = channel_key[len("source:"):]
        if source == "内推":
            return "referral"
        source_tags_by_name = source_tags_by_name or _source_tag_lookup(db)[0]
        term = source_tags_by_name.get(source)
        if term:
            return f"source_tag:{term.id}"
        return "other"
    return channel_key


# ── 总览 ─────────────────────────────────────────────────────

def get_overview(
    db: Session,
    start: date,
    end: date,
    granularity: str = "week",
) -> dict:
    """总览聚合：6 卡片 + 环比 + trend + funnel + end_reasons。"""

    # 焦点范围的 datetime 边界
    dt_start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    dt_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)

    # 环比窗口
    prev_start, prev_end = _prev_window(start, end)
    dt_prev_start = datetime(prev_start.year, prev_start.month, prev_start.day, tzinfo=timezone.utc)
    dt_prev_end = datetime(prev_end.year, prev_end.month, prev_end.day, 23, 59, 59, tzinfo=timezone.utc)

    # ── Cards ──

    def _count_cards(s: datetime, e: datetime) -> dict:
        # 新建档（Candidate.created_at）
        new_candidates = (
            db.query(func.count(Candidate.id))
            .filter(
                Candidate.created_at >= s,
                Candidate.created_at <= e,
                Candidate.deleted_at == None,  # noqa: E711
                Candidate.merged_into == None,  # noqa: E711
            )
            .scalar() or 0
        )

        # 新流程（Application.created_at）
        new_applications = (
            db.query(func.count(Application.id))
            .filter(
                Application.created_at >= s,
                Application.created_at <= e,
            )
            .scalar() or 0
        )

        # 入职（hire_confirmed event 在焦点范围内）
        hired = (
            db.query(func.count(func.distinct(Event.application_id)))
            .filter(
                Event.type == EventType.HIRE_CONFIRMED.value,
                Event.occurred_at >= s,
                Event.occurred_at <= e,
            )
            .scalar() or 0
        )

        # 结束（application_ended event 在焦点范围内）
        ended = (
            db.query(func.count(func.distinct(Event.application_id)))
            .filter(
                Event.type == EventType.APPLICATION_ENDED.value,
                Event.occurred_at >= s,
                Event.occurred_at <= e,
            )
            .scalar() or 0
        )

        # 平均周期（本期入职者从 Application 创建到 hire_confirmed 的天数）
        hire_events = (
            db.query(Event)
            .filter(
                Event.type == EventType.HIRE_CONFIRMED.value,
                Event.occurred_at >= s,
                Event.occurred_at <= e,
            )
            .options(joinedload(Event.application))
            .all()
        )
        cycle_days_list = []
        for ev in hire_events:
            app = ev.application
            if app and app.created_at:
                delta = (ev.occurred_at - app.created_at).days
                cycle_days_list.append(delta)
        avg_cycle = round(sum(cycle_days_list) / len(cycle_days_list), 1) if cycle_days_list else None

        # 总费用（Expense.occurred_at 在焦点范围 + 猎头费按 hire_confirmed 归属）
        expense_total = (
            db.query(func.coalesce(func.sum(Expense.amount), 0.0))
            .filter(
                Expense.occurred_at >= s,
                Expense.occurred_at <= e,
            )
            .scalar() or 0.0
        )
        hh_fee = sum(_headhunter_fees_by_hire_date(db, s, e).values())
        total_cost = expense_total + hh_fee

        return {
            "new_candidates": new_candidates,
            "new_applications": new_applications,
            "hired": hired,
            "ended": ended,
            "avg_cycle_days": avg_cycle,
            "total_cost": round(total_cost, 2),
        }

    current = _count_cards(dt_start, dt_end)
    previous = _count_cards(dt_prev_start, dt_prev_end)

    cards = []
    for key in ["new_candidates", "new_applications", "hired", "ended", "avg_cycle_days", "total_cost"]:
        cur_val = current[key]
        prev_val = previous[key]
        delta = _delta_value(cur_val, prev_val)
        delta_percent = _pct_change(cur_val, prev_val) if cur_val is not None and prev_val is not None else None
        cards.append({
            "key": key,
            "value": cur_val,
            "delta": delta,
            "delta_percent": delta_percent,
            "previous": prev_val,
            "change": delta_percent,
        })

    # ── Trend（B 图数据：焦点范围 × 粒度）──
    # 统计每个粒度桶的新增 + 入职
    trend_apps = (
        db.query(Application.created_at)
        .filter(
            Application.created_at >= dt_start,
            Application.created_at <= dt_end,
        )
        .all()
    )
    trend_hired = (
        db.query(Event.occurred_at)
        .filter(
            Event.type == EventType.HIRE_CONFIRMED.value,
            Event.occurred_at >= dt_start,
            Event.occurred_at <= dt_end,
        )
        .all()
    )

    buckets: dict[str, dict] = {}
    for (created_at,) in trend_apps:
        if created_at:
            d = created_at.date() if isinstance(created_at, datetime) else created_at
            b = _bucket_date(d, granularity)
            buckets.setdefault(b, {"period_start": b, "bucket": b, "new_applications": 0, "hired": 0})
            buckets[b]["new_applications"] += 1
    for (occurred_at,) in trend_hired:
        if occurred_at:
            d = occurred_at.date() if isinstance(occurred_at, datetime) else occurred_at
            b = _bucket_date(d, granularity)
            buckets.setdefault(b, {"period_start": b, "bucket": b, "new_applications": 0, "hired": 0})
            buckets[b]["hired"] += 1

    trend = sorted(buckets.values(), key=lambda x: x["period_start"])

    # ── Funnel（cohort：焦点范围内新建的 Application）──
    cohort_apps = (
        db.query(Application)
        .filter(
            Application.created_at >= dt_start,
            Application.created_at <= dt_end,
        )
        .all()
    )

    stage_counts: dict[str, int] = {s: 0 for s in FUNNEL_STAGES}
    for app in cohort_apps:
        app_stage = _get_stage_for_app(app)
        rank = _STAGE_RANK.get(app_stage, 0)
        # 该 app 到达了 app_stage，意味着它通过了所有 <= rank 的阶段
        for i, stage in enumerate(FUNNEL_STAGES):
            if i <= rank:
                stage_counts[stage] += 1

    total_cohort = len(cohort_apps)
    funnel = []
    for i, stage in enumerate(FUNNEL_STAGES):
        count = stage_counts[stage]
        prev_count = stage_counts[FUNNEL_STAGES[i - 1]] if i > 0 else total_cohort
        conversion = round(count / prev_count * 100, 1) if prev_count > 0 else None
        funnel.append({
            "stage": stage,
            "count": count,
            "conversion": conversion,
        })

    # ── End Reasons（焦点范围内结束的 Application）──
    end_events = (
        db.query(Event)
        .filter(
            Event.type == EventType.APPLICATION_ENDED.value,
            Event.occurred_at >= dt_start,
            Event.occurred_at <= dt_end,
        )
        .all()
    )

    rejected_reasons: dict[str, int] = {}
    withdrawn_reasons: dict[str, int] = {}
    for ev in end_events:
        payload = ev.payload or {}
        outcome = payload.get("outcome", "rejected")
        reason_code = payload.get("reason_code", "other")
        label = CLOSE_REASON_LABELS.get(reason_code, reason_code)
        if payload.get("body") and reason_code == "other":
            label = payload["body"]
        if outcome == Outcome.WITHDRAWN.value:
            withdrawn_reasons[label] = withdrawn_reasons.get(label, 0) + 1
        else:
            rejected_reasons[label] = rejected_reasons.get(label, 0) + 1

    def _sorted_reasons(d: dict[str, int]) -> list[dict]:
        return sorted(
            [{"reason": k, "count": v} for k, v in d.items()],
            key=lambda x: -x["count"],
        )

    end_reasons = {
        "rejected": {
            "label": "未通过",
            "total": sum(rejected_reasons.values()),
            "items": _sorted_reasons(rejected_reasons),
        },
        "withdrawn": {
            "label": "候选人退出",
            "total": sum(withdrawn_reasons.values()),
            "items": _sorted_reasons(withdrawn_reasons),
        },
    }

    return {
        "cards": cards,
        "trend": trend,
        "funnel": funnel,
        "funnel_cohort_size": total_cohort,
        "end_reasons": end_reasons,
    }


# ── 岗位分析 ─────────────────────────────────────────────────

def get_jobs_list(
    db: Session,
    start: date,
    end: date,
    filter_status: str = "open",
) -> dict:
    """岗位分析列表：per-job cohort 漏斗 + 通过率 + 平均周期 + 合计行。"""

    dt_start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    dt_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)

    # 获取岗位列表
    job_q = db.query(Job)
    if filter_status == "open":
        job_q = job_q.filter(Job.status == "open")
    elif filter_status == "closed":
        job_q = job_q.filter(Job.status == "closed")
    jobs = job_q.all()

    # 焦点范围内的 cohort Applications（按 job 分组）
    cohort_apps = (
        db.query(Application)
        .filter(
            Application.created_at >= dt_start,
            Application.created_at <= dt_end,
        )
        .all()
    )

    apps_by_job: dict[int, list[Application]] = {}
    for app in cohort_apps:
        apps_by_job.setdefault(app.job_id, []).append(app)

    hired_counts = _hired_counts_by_job(db, [job.id for job in jobs])

    # 入职事件（算平均周期）
    hire_events = (
        db.query(Event)
        .filter(
            Event.type == EventType.HIRE_CONFIRMED.value,
            Event.occurred_at >= dt_start,
            Event.occurred_at <= dt_end,
        )
        .options(joinedload(Event.application))
        .all()
    )
    hires_by_job: dict[int, list[Event]] = {}
    for ev in hire_events:
        if ev.application:
            hires_by_job.setdefault(ev.application.job_id, []).append(ev)

    # 构建 per-job 数据
    items = []
    total_funnel = {s: 0 for s in FUNNEL_STAGES}
    total_apps = 0
    total_hired_count = 0
    total_cycle_days = []

    for job in jobs:
        job_apps = apps_by_job.get(job.id, [])
        job_count = len(job_apps)

        # cohort 漏斗
        stage_counts = {s: 0 for s in FUNNEL_STAGES}
        for app in job_apps:
            app_stage = _get_stage_for_app(app)
            rank = _STAGE_RANK.get(app_stage, 0)
            for i, stage in enumerate(FUNNEL_STAGES):
                if i <= rank:
                    stage_counts[stage] += 1

        # 通过率 = 入职 / 新增
        cohort_hired_count = stage_counts["已入职"]
        pass_rate = round(cohort_hired_count / job_count * 100, 1) if job_count > 0 else None

        # 平均周期
        job_hires = hires_by_job.get(job.id, [])
        cycle_list = []
        for ev in job_hires:
            if ev.application and ev.application.created_at:
                cycle_list.append((ev.occurred_at - ev.application.created_at).days)
        avg_cycle_days = round(sum(cycle_list) / len(cycle_list), 1) if cycle_list else None
        hired_count = hired_counts.get(job.id, 0)

        items.append({
            "id": job.id,
            "job_id": job.id,
            "title": job.title,
            "city": job.city,
            "status": job.status,
            "priority": job.priority,
            "headcount": job.headcount,
            "hired_count": hired_count,
            "funnel": [{"stage": s, "count": stage_counts[s]} for s in FUNNEL_STAGES],
            "pass_rate": pass_rate,
            "avg_cycle_days": avg_cycle_days,
            "avg_cycle": avg_cycle_days,
        })

        total_apps += job_count
        total_hired_count += cohort_hired_count
        total_cycle_days.extend(cycle_list)
        for s in FUNNEL_STAGES:
            total_funnel[s] += stage_counts[s]

    # 合计行
    total_pass_rate = round(total_hired_count / total_apps * 100, 1) if total_apps > 0 else None
    total_avg_cycle = round(sum(total_cycle_days) / len(total_cycle_days), 1) if total_cycle_days else None

    totals = {
        "funnel": [{"stage": s, "count": total_funnel[s]} for s in FUNNEL_STAGES],
        "pass_rate": total_pass_rate,
        "avg_cycle_days": total_avg_cycle,
        "avg_cycle": total_avg_cycle,
    }

    return {"items": items, "totals": totals}


def get_job_drilldown(
    db: Session,
    job_id: int,
    start: date,
    end: date,
) -> dict:
    """岗位 drill-down：漏斗 + 阶段耗时 + 来源分布 + 结束原因。"""

    dt_start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    dt_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return {"error": "job_not_found"}

    # cohort
    cohort_apps = (
        db.query(Application)
        .filter(
            Application.job_id == job_id,
            Application.created_at >= dt_start,
            Application.created_at <= dt_end,
        )
        .options(joinedload(Application.events), joinedload(Application.candidate))
        .all()
    )

    # 漏斗
    stage_counts = {s: 0 for s in FUNNEL_STAGES}
    for app in cohort_apps:
        app_stage = _get_stage_for_app(app)
        rank = _STAGE_RANK.get(app_stage, 0)
        for i, stage in enumerate(FUNNEL_STAGES):
            if i <= rank:
                stage_counts[stage] += 1

    total_cohort = len(cohort_apps)
    funnel = []
    for i, stage in enumerate(FUNNEL_STAGES):
        count = stage_counts[stage]
        prev_count = stage_counts[FUNNEL_STAGES[i - 1]] if i > 0 else total_cohort
        conversion = round(count / prev_count * 100, 1) if prev_count > 0 else None
        funnel.append({"stage": stage, "count": count, "conversion": conversion})

    # 阶段耗时：计算已离开各阶段的候选人的停留天数
    stage_durations = _calc_stage_durations(cohort_apps)

    # 来源分布
    source_dist: dict[str, int] = {}
    for app in cohort_apps:
        if app.candidate:
            src = _display_source(app.candidate, db)
            source_dist[src] = source_dist.get(src, 0) + 1
    source_distribution = sorted(
        [{"source": k, "count": v} for k, v in source_dist.items()],
        key=lambda x: -x["count"],
    )

    # 结束原因
    end_reasons = _collect_end_reasons(cohort_apps)

    # 岗位基本信息
    hired_count = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id == job_id,
            Application.state == ApplicationState.HIRED.value,
        )
        .scalar() or 0
    )

    return {
        "job": {
            "id": job.id,
            "title": job.title,
            "city": job.city,
            "status": job.status,
            "priority": job.priority,
            "headcount": job.headcount,
            "hired_count": hired_count,
            "hired_total": hired_count,
            "target_onboard_date": _iso_or_none(job.target_onboard_date),
        },
        "funnel": funnel,
        "funnel_cohort_size": total_cohort,
        "stage_durations": stage_durations,
        "source_distribution": source_distribution,
        "end_reasons": end_reasons,
    }


def _calc_stage_durations(apps: list[Application]) -> list[dict]:
    """计算各阶段平均停留天数。只算已离开该阶段的候选人。"""
    stage_times: dict[str, list[int]] = {s: [] for s in FUNNEL_STAGES}

    for app in apps:
        events = sorted(app.events, key=lambda e: e.occurred_at)
        if not events:
            continue

        # 构建阶段时间线
        stage_enter: dict[str, datetime] = {}
        current_stage = "简历筛选"
        stage_enter[current_stage] = events[0].occurred_at

        stage_advancing_events = {
            EventType.SCREENING_PASSED.value: "面试",
            EventType.ADVANCE_TO_OFFER.value: "Offer沟通",
            EventType.START_BACKGROUND_CHECK.value: "背调",
            EventType.OFFER_RECORDED.value: "待入职",
            EventType.HIRE_CONFIRMED.value: "已入职",
        }

        for ev in events:
            next_stage = stage_advancing_events.get(ev.type)
            if next_stage:
                # 离开当前阶段
                if current_stage in stage_enter:
                    days = (ev.occurred_at - stage_enter[current_stage]).days
                    stage_times[current_stage].append(days)
                current_stage = next_stage
                stage_enter[current_stage] = ev.occurred_at

            # application_ended → 离开当前阶段
            if ev.type == EventType.APPLICATION_ENDED.value:
                if current_stage in stage_enter:
                    days = (ev.occurred_at - stage_enter[current_stage]).days
                    stage_times[current_stage].append(days)

    result = []
    for stage in FUNNEL_STAGES:
        times = stage_times[stage]
        avg = round(sum(times) / len(times), 1) if times else None
        result.append({"stage": stage, "avg_days": avg, "sample_size": len(times)})
    return result


def _display_source(candidate: Candidate, db: Session) -> str:
    """候选人来源的显示名。"""
    if candidate.supplier_id:
        return _supplier_name(db, candidate.supplier_id)
    return candidate.source or "未知来源"


def _collect_end_reasons(apps: list[Application]) -> dict:
    """从 Application 列表中收集结束原因二分类。"""
    rejected_reasons: dict[str, int] = {}
    withdrawn_reasons: dict[str, int] = {}

    for app in apps:
        for ev in app.events:
            if ev.type != EventType.APPLICATION_ENDED.value:
                continue
            payload = ev.payload or {}
            outcome = payload.get("outcome", "rejected")
            reason_code = payload.get("reason_code", "other")
            label = CLOSE_REASON_LABELS.get(reason_code, reason_code)
            if payload.get("body") and reason_code == "other":
                label = payload["body"]
            if outcome == Outcome.WITHDRAWN.value:
                withdrawn_reasons[label] = withdrawn_reasons.get(label, 0) + 1
            else:
                rejected_reasons[label] = rejected_reasons.get(label, 0) + 1

    def _sorted(d: dict[str, int]) -> list[dict]:
        return sorted([{"reason": k, "count": v} for k, v in d.items()], key=lambda x: -x["count"])

    return {
        "rejected": {"label": "未通过", "total": sum(rejected_reasons.values()), "items": _sorted(rejected_reasons)},
        "withdrawn": {"label": "候选人退出", "total": sum(withdrawn_reasons.values()), "items": _sorted(withdrawn_reasons)},
    }


# ── 渠道分析 ─────────────────────────────────────────────────

def get_channels_list(
    db: Session,
    start: date,
    end: date,
) -> dict:
    """渠道分析列表：三 section 分组 + per-channel cohort + 转化率 + 人均成本。"""

    dt_start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    dt_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)
    source_tags_by_name, source_tags_by_id = _source_tag_lookup(db)

    # 焦点范围内新建的 Application（cohort）
    cohort_apps = (
        db.query(Application)
        .filter(
            Application.created_at >= dt_start,
            Application.created_at <= dt_end,
        )
        .options(joinedload(Application.candidate))
        .all()
    )

    # 按渠道分组
    channel_data: dict[str, dict] = {}
    for app in cohort_apps:
        if not app.candidate:
            continue
        channel_meta = _channel_meta_for_candidate(app.candidate, db, source_tags_by_name)
        key = channel_meta["key"]
        if key not in channel_data:
            channel_data[key] = {
                **channel_meta,
                "apps": [],
            }
        channel_data[key]["apps"].append(app)

    # 费用（焦点范围内）
    expenses = (
        db.query(Expense)
        .filter(Expense.occurred_at >= dt_start, Expense.occurred_at <= dt_end)
        .all()
    )
    expense_by_channel: dict[str, float] = {}
    for exp in expenses:
        if exp.channel_type == "supplier":
            ck = f"supplier:{exp.channel_id}"
        elif exp.channel_type == "source_tag":
            ck = f"source_tag:{exp.channel_id}" if exp.channel_id in source_tags_by_id else "other"
        else:
            ck = "other"
        expense_by_channel[ck] = expense_by_channel.get(ck, 0.0) + exp.amount

    headhunter_fees = _headhunter_fees_by_hire_date(db, dt_start, dt_end)
    if headhunter_fees:
        hired_apps = (
            db.query(Application)
            .filter(Application.id.in_(set(headhunter_fees.keys())))
            .options(joinedload(Application.candidate))
            .all()
        )
        for app in hired_apps:
            if app.candidate and app.candidate.supplier_id:
                key = f"supplier:{app.candidate.supplier_id}"
                expense_by_channel[key] = expense_by_channel.get(key, 0.0) + headhunter_fees.get(app.id, 0.0)

    # 构建结果
    # 按 section 分组
    sections: dict[str, list[dict]] = {"headhunter": [], "platform": [], "other": []}

    # 也包含有费用但没有 cohort apps 的渠道
    all_keys = set(channel_data.keys()) | set(expense_by_channel.keys())

    for key in all_keys:
        data = channel_data.get(key, {
            "key": key,
            "name": _name_for_key(key, db),
            "type": _type_for_key(key, source_tags_by_id),
            "section_key": _section_for_key(key, source_tags_by_id),
            "section_label": SECTION_LABELS[_section_for_key(key, source_tags_by_id)],
            "apps": [],
        })
        apps = data["apps"]
        app_count = len(apps)

        # cohort 漏斗
        stage_counts = {s: 0 for s in FUNNEL_STAGES}
        for app in apps:
            app_stage = _get_stage_for_app(app)
            rank = _STAGE_RANK.get(app_stage, 0)
            for i, stage in enumerate(FUNNEL_STAGES):
                if i <= rank:
                    stage_counts[stage] += 1

        hired_count = stage_counts["已入职"]
        conversion_rate = round(hired_count / app_count * 100, 1) if app_count > 0 else None

        total_expense = expense_by_channel.get(key, 0.0)
        cost_per_hire = round(total_expense / hired_count, 2) if hired_count > 0 else None

        section_key = data["section_key"]
        sections.setdefault(section_key, []).append({
            "key": key,
            "name": data["name"],
            "type": data["type"],
            "funnel": [{"stage": s, "count": stage_counts[s]} for s in FUNNEL_STAGES],
            "conversion_rate": conversion_rate,
            "cost_per_hire": cost_per_hire,
            "total_expense": round(total_expense, 2),
        })

    # 排序：按推荐数降序
    for section_items in sections.values():
        section_items.sort(key=lambda x: (-(x["funnel"][0]["count"] if x["funnel"] else 0), x["name"]))

    return {"sections": [
        {"key": section_key, "label": SECTION_LABELS[section_key], "items": sections.get(section_key, [])}
        for section_key in ["headhunter", "platform", "other"]
    ]}


def get_channel_drilldown(
    db: Session,
    channel_key: str,
    start: date,
    end: date,
) -> dict:
    """渠道 drill-down：漏斗 + 结束原因 + 岗位分布 + 费用明细。"""

    dt_start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    dt_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)
    source_tags_by_name, _ = _source_tag_lookup(db)
    canonical_key = _canonical_channel_key(channel_key, db, source_tags_by_name)

    # 获取该渠道的 cohort apps
    cohort_apps = (
        db.query(Application)
        .filter(
            Application.created_at >= dt_start,
            Application.created_at <= dt_end,
        )
        .options(
            joinedload(Application.candidate),
            joinedload(Application.events),
            joinedload(Application.job),
        )
        .all()
    )

    # 过滤属于该渠道的 apps
    channel_apps = [
        app for app in cohort_apps
        if app.candidate and _channel_key_for_candidate(app.candidate, db, source_tags_by_name) == canonical_key
    ]

    # 漏斗
    stage_counts = {s: 0 for s in FUNNEL_STAGES}
    for app in channel_apps:
        app_stage = _get_stage_for_app(app)
        rank = _STAGE_RANK.get(app_stage, 0)
        for i, stage in enumerate(FUNNEL_STAGES):
            if i <= rank:
                stage_counts[stage] += 1

    total_cohort = len(channel_apps)
    funnel = []
    for i, stage in enumerate(FUNNEL_STAGES):
        count = stage_counts[stage]
        prev_count = stage_counts[FUNNEL_STAGES[i - 1]] if i > 0 else total_cohort
        conversion = round(count / prev_count * 100, 1) if prev_count > 0 else None
        funnel.append({"stage": stage, "count": count, "conversion": conversion})

    # 结束原因
    end_reasons = _collect_end_reasons(channel_apps)

    # 岗位分布
    job_dist: dict[int, dict] = {}
    for app in channel_apps:
        if app.job:
            jid = app.job.id
            if jid not in job_dist:
                job_dist[jid] = {"job_id": jid, "title": app.job.title, "count": 0}
            job_dist[jid]["count"] += 1
    job_distribution = sorted(job_dist.values(), key=lambda x: -x["count"])

    # 费用明细
    expense_detail = _get_channel_expenses(db, canonical_key, dt_start, dt_end)

    # 渠道基本信息
    channel_info = _get_channel_info(db, canonical_key)

    return {
        "channel": channel_info,
        "funnel": funnel,
        "funnel_cohort_size": total_cohort,
        "end_reasons": end_reasons,
        "job_distribution": job_distribution,
        "expense_detail": expense_detail,
    }


def _name_for_key(key: str, db: Session) -> str:
    """根据 channel_key 获取显示名。"""
    if key.startswith("supplier:"):
        sid = int(key.split(":")[1])
        return _supplier_name(db, sid)
    if key == "referral":
        return "内推"
    if key == "other":
        return "其他来源"
    if key.startswith("source_tag:"):
        term_id = int(key.split(":")[1])
        term = db.query(Term).filter(Term.id == term_id, Term.type.in_(["platform", "other"])).first()
        return term.name if term else "未知来源"
    if key.startswith("source:"):
        return _name_for_key(_canonical_channel_key(key, db), db)
    return key


def _section_for_key(key: str, source_tags_by_id: dict[int, Term] | None = None) -> str:
    """根据 channel_key 判断所属 section。"""
    if key.startswith("supplier:"):
        return "headhunter"
    if key.startswith("source_tag:"):
        if source_tags_by_id:
            term_id = int(key.split(":")[1])
            term = source_tags_by_id.get(term_id)
            if term:
                return term.type  # 'platform' or 'other'
        return "platform"
    return "other"


def _type_for_key(key: str, source_tags_by_id: dict[int, Term] | None = None) -> str:
    return _section_for_key(key, source_tags_by_id)


def _contract_status_for_supplier(supplier: Supplier) -> str | None:
    today = datetime.now(timezone.utc).date()
    contract_start = _parse_date(supplier.contract_start)
    contract_end = _parse_date(supplier.contract_end)

    if not contract_start and not contract_end:
        return None
    if contract_start and today < contract_start:
        return None
    if contract_end and today > contract_end:
        return "已到期"
    return "合作中"


def _get_channel_expenses(
    db: Session,
    channel_key: str,
    dt_start: datetime,
    dt_end: datetime,
) -> dict:
    """获取渠道费用明细。"""
    canonical_key = _canonical_channel_key(channel_key, db)
    # 普通费用（Expense 表）
    channel_expenses = []
    if canonical_key.startswith("supplier:"):
        sid = int(canonical_key.split(":")[1])
        channel_expenses = (
            db.query(Expense)
            .filter(
                Expense.channel_type == "supplier",
                Expense.channel_id == sid,
                Expense.occurred_at >= dt_start,
                Expense.occurred_at <= dt_end,
            )
            .all()
        )
    elif canonical_key.startswith("source_tag:"):
        term_id = int(canonical_key.split(":")[1])
        channel_expenses = (
            db.query(Expense)
            .filter(
                Expense.channel_type == "source_tag",
                Expense.channel_id == term_id,
                Expense.occurred_at >= dt_start,
                Expense.occurred_at <= dt_end,
            )
            .all()
        )

    platform_cost = sum(e.amount for e in channel_expenses)

    # 猎头费（仅 supplier 渠道）
    headhunter_fee = 0.0
    if canonical_key.startswith("supplier:"):
        sid = int(canonical_key.split(":")[1])
        headhunter_fees = _headhunter_fees_by_hire_date(db, dt_start, dt_end)
        if headhunter_fees:
            hired_apps = (
                db.query(Application)
                .filter(Application.id.in_(set(headhunter_fees.keys())))
                .options(joinedload(Application.candidate))
                .all()
            )
            for app in hired_apps:
                if app.candidate and app.candidate.supplier_id == sid:
                    headhunter_fee += headhunter_fees.get(app.id, 0.0)

    return {
        "platform_cost": round(platform_cost, 2),
        "headhunter_fee": round(headhunter_fee, 2),
        "total": round(platform_cost + headhunter_fee, 2),
    }


def _get_channel_info(db: Session, channel_key: str) -> dict:
    """获取渠道基本信息。"""
    canonical_key = _canonical_channel_key(channel_key, db)
    _, source_tags_by_id = _source_tag_lookup(db)
    section_key = _section_for_key(canonical_key, source_tags_by_id)
    info: dict[str, Any] = {
        "key": canonical_key,
        "name": _name_for_key(canonical_key, db),
        "type": _type_for_key(canonical_key, source_tags_by_id),
        "section_key": section_key,
        "section": SECTION_LABELS[section_key],
        "contract_status": None,
    }

    if canonical_key.startswith("supplier:"):
        sid = int(canonical_key.split(":")[1])
        supplier = db.query(Supplier).filter(Supplier.id == sid).first()
        if supplier:
            info["name"] = supplier.name
            info["contract_end"] = supplier.contract_end
            info["deleted_at"] = supplier.deleted_at.isoformat() if supplier.deleted_at else None
            info["contract_status"] = _contract_status_for_supplier(supplier)

    return info
