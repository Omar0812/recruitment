from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, date

from app.database import get_db
from app.models import ActivityRecord, CandidateJobLink, Candidate, Job

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _period_start(period: str):
    """Return the start datetime for the given period, or None for 'all'."""
    now = datetime.utcnow()
    if period == "month":
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        month = now.month
        quarter_start_month = ((month - 1) // 3) * 3 + 1
        return now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None  # 'all' = no restriction


@router.get("/dashboard")
def get_dashboard(period: str = "all", db: Session = Depends(get_db)):
    start = _period_start(period)
    now = datetime.utcnow()

    # ── 总览指标 ──────────────────────────────────────────────────────────────

    # 当前在途数（全局快照，不受 period 影响）
    in_progress = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "IN_PROGRESS", Candidate.deleted_at.is_(None))
        .count()
    )

    # 期间新增 candidate 数
    cand_q = db.query(Candidate).filter(Candidate.deleted_at.is_(None))
    if start:
        cand_q = cand_q.filter(Candidate.created_at >= start)
    new_candidates = cand_q.count()

    # 期间新增 link 数
    link_q = db.query(CandidateJobLink).join(Candidate, CandidateJobLink.candidate_id == Candidate.id).filter(Candidate.deleted_at.is_(None))
    if start:
        link_q = link_q.filter(CandidateJobLink.created_at >= start)
    new_links = link_q.count()

    # 期间安排面试数
    iv_q = (
        db.query(ActivityRecord)
        .join(CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(ActivityRecord.type == "interview", Candidate.deleted_at.is_(None))
    )
    if start:
        iv_q = iv_q.filter(ActivityRecord.created_at >= start)
    new_interviews = iv_q.count()

    # 期间入职数
    hired_q = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "HIRED", Candidate.deleted_at.is_(None))
    )
    if start:
        hired_q = hired_q.filter(CandidateJobLink.updated_at >= start)
    new_hired = hired_q.count()

    # 期间淘汰数
    rej_q = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "REJECTED", Candidate.deleted_at.is_(None))
    )
    if start:
        rej_q = rej_q.filter(CandidateJobLink.updated_at >= start)
    new_rejected = rej_q.count()

    overview = {
        "in_progress": in_progress,
        "new_candidates": new_candidates,
        "new_links": new_links,
        "new_interviews": new_interviews,
        "new_hired": new_hired,
        "new_rejected": new_rejected,
    }

    # ── 招聘漏斗（全局快照，不受 period 影响）────────────────────────────────
    active_links = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "IN_PROGRESS", Candidate.deleted_at.is_(None))
        .all()
    )
    stage_order = ["简历筛选", "电话初筛", "面试", "Offer", "背调", "入职"]
    stage_counts = {}
    for lnk in active_links:
        if lnk.stage:
            stage_counts[lnk.stage] = stage_counts.get(lnk.stage, 0) + 1

    total_funnel = sum(stage_counts.values()) or 1
    colors = ["#1677ff", "#13c2c2", "#722ed1", "#d4380d", "#fa8c16", "#52c41a"]
    funnel = []
    for i, s in enumerate(stage_order):
        if s in stage_counts:
            funnel.append({
                "stage": s,
                "count": stage_counts[s],
                "pct": round(stage_counts[s] / total_funnel * 100),
                "color": colors[i % len(colors)],
            })
    # also include stages not in the predefined order
    for s, cnt in stage_counts.items():
        if s not in stage_order:
            funnel.append({"stage": s, "count": cnt, "pct": round(cnt / total_funnel * 100), "color": "#8c8c8c"})

    # ── 岗位健康度 ────────────────────────────────────────────────────────────
    jobs = db.query(Job).options(joinedload(Job.candidate_links).joinedload(CandidateJobLink.candidate)).all()
    job_health = []

    for job in jobs:
        links = [lnk for lnk in job.candidate_links if lnk.candidate and lnk.candidate.deleted_at is None]

        # 在途数（全局快照）
        job_in_progress = sum(1 for lnk in links if lnk.state == "IN_PROGRESS")

        # 期间新增
        if start:
            job_new = sum(1 for lnk in links if lnk.created_at and lnk.created_at >= start)
        else:
            job_new = len(links)

        # 期间入职
        if start:
            job_hired = sum(1 for lnk in links if lnk.state == "HIRED" and lnk.updated_at and lnk.updated_at >= start)
        else:
            job_hired = sum(1 for lnk in links if lnk.state == "HIRED")

        # 期间淘汰
        if start:
            job_rejected = sum(1 for lnk in links if lnk.state == "REJECTED" and lnk.updated_at and lnk.updated_at >= start)
        else:
            job_rejected = sum(1 for lnk in links if lnk.state == "REJECTED")

        # 进面率：link 中有 interview 活动的比例
        link_ids_with_interview = set()
        all_link_ids = {lnk.id for lnk in links}
        if all_link_ids:
            iv_records = (
                db.query(ActivityRecord.link_id)
                .filter(ActivityRecord.link_id.in_(all_link_ids), ActivityRecord.type == "interview")
                .distinct()
                .all()
            )
            link_ids_with_interview = {r[0] for r in iv_records}

        interview_rate = None
        if links:
            interview_rate = round(len(link_ids_with_interview) / len(links) * 100)

        # 平均流程周期（已完结 link）
        completed_links = [lnk for lnk in links if lnk.state in ("HIRED", "REJECTED", "WITHDRAWN") and lnk.created_at and lnk.updated_at]
        avg_days = None
        if completed_links:
            avg_days = round(sum((lnk.updated_at - lnk.created_at).days for lnk in completed_links) / len(completed_links), 1)

        # 主要淘汰原因
        rejected_links = [lnk for lnk in links if lnk.state == "REJECTED"]
        reason_counts = {}
        for lnk in rejected_links:
            reason = lnk.rejection_reason or "未填写"
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
        top_reason = max(reason_counts, key=reason_counts.get) if reason_counts else None

        job_health.append({
            "job_id": job.id,
            "job_title": job.title,
            "job_status": job.status,
            "in_progress": job_in_progress,
            "new_links": job_new,
            "hired": job_hired,
            "rejected": job_rejected,
            "interview_rate": interview_rate,
            "avg_days": avg_days,
            "top_rejection_reason": top_reason,
        })

    # 按在途数降序排列
    job_health.sort(key=lambda x: x["in_progress"], reverse=True)

    # ── 渠道ROI ───────────────────────────────────────────────────────────────
    all_candidates = (
        db.query(Candidate)
        .filter(Candidate.deleted_at.is_(None))
        .options(
            joinedload(Candidate.job_links).joinedload(CandidateJobLink.activity_records),
            joinedload(Candidate.supplier),
        )
        .all()
    )

    source_map = {}  # source -> {candidates, interviewed, hired}
    for cand in all_candidates:
        source = cand.source or "未知来源"
        if source not in source_map:
            source_map[source] = {"candidates": 0, "interviewed": 0, "hired": 0}

        source_map[source]["candidates"] += 1

        # check if candidate has any interview activity
        has_interview = any(
            ar.type == "interview"
            for lnk in cand.job_links
            for ar in lnk.activity_records
        )
        if has_interview:
            source_map[source]["interviewed"] += 1

        # check if any link is HIRED
        hired_links_for_cand = [lnk for lnk in cand.job_links if lnk.state == "HIRED"]
        if hired_links_for_cand:
            source_map[source]["hired"] += 1

    channel_roi = [
        {
            "source": source,
            "candidates": data["candidates"],
            "interviewed": data["interviewed"],
            "hired": data["hired"],
        }
        for source, data in source_map.items()
    ]
    channel_roi.sort(key=lambda x: x["candidates"], reverse=True)

    # ── 淘汰原因分布 ──────────────────────────────────────────────────────────
    rej_links = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "REJECTED", Candidate.deleted_at.is_(None))
    )
    if start:
        rej_links = rej_links.filter(CandidateJobLink.updated_at >= start)
    rej_links = rej_links.all()

    rejection_map = {}
    for lnk in rej_links:
        reason = lnk.rejection_reason or "未填写"
        rejection_map[reason] = rejection_map.get(reason, 0) + 1

    total_rejected = sum(rejection_map.values()) or 1
    rejection_dist = sorted(
        [{"reason": r, "count": c, "pct": round(c / total_rejected * 100)} for r, c in rejection_map.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    return {
        "period": period,
        "overview": overview,
        "funnel": funnel,
        "job_health": job_health,
        "channel_roi": channel_roi,
        "rejection_dist": rejection_dist,
    }


@router.get("/weekly-report")
def get_weekly_report(period: str = "month", db: Session = Depends(get_db)):
    start = _period_start(period)
    now = datetime.utcnow()

    period_labels = {"month": "月", "quarter": "季", "year": "年", "all": "期"}
    period_label = period_labels.get(period, "期")
    today_str = now.strftime("%Y-%m-%d")

    # 统计指标
    cand_q = db.query(Candidate).filter(Candidate.deleted_at.is_(None))
    if start:
        cand_q = cand_q.filter(Candidate.created_at >= start)
    new_candidates = cand_q.count()

    iv_q = (
        db.query(ActivityRecord)
        .join(CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(ActivityRecord.type == "interview", Candidate.deleted_at.is_(None))
    )
    if start:
        iv_q = iv_q.filter(ActivityRecord.created_at >= start)
    new_interviews = iv_q.count()

    hired_q = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "HIRED", Candidate.deleted_at.is_(None))
    )
    if start:
        hired_q = hired_q.filter(CandidateJobLink.updated_at >= start)
    new_hired = hired_q.count()

    if new_candidates == 0 and new_interviews == 0 and new_hired == 0:
        return {"text": "本期暂无招聘数据"}

    # 岗位进展
    jobs = db.query(Job).options(joinedload(Job.candidate_links).joinedload(CandidateJobLink.candidate)).all()
    job_lines = []
    for job in jobs:
        links = [lnk for lnk in job.candidate_links if lnk.candidate and lnk.candidate.deleted_at is None]
        job_in_progress = sum(1 for lnk in links if lnk.state == "IN_PROGRESS")
        if start:
            job_hired = sum(1 for lnk in links if lnk.state == "HIRED" and lnk.updated_at and lnk.updated_at >= start)
            job_stale = sum(1 for lnk in links if lnk.state == "IN_PROGRESS" and lnk.updated_at and (now - lnk.updated_at).days > 5)
        else:
            job_hired = sum(1 for lnk in links if lnk.state == "HIRED")
            job_stale = sum(1 for lnk in links if lnk.state == "IN_PROGRESS" and lnk.updated_at and (now - lnk.updated_at).days > 5)

        if job_in_progress > 0 or job_hired > 0:
            line = f"· {job.title}：进行中 {job_in_progress} 人，本期入职 {job_hired} 人"
            if job_stale > 0:
                line += f"，停滞 {job_stale} 人（>5天）"
            job_lines.append(line)

    # 淘汰原因 top 3
    rej_links = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(CandidateJobLink.state == "REJECTED", Candidate.deleted_at.is_(None))
    )
    if start:
        rej_links = rej_links.filter(CandidateJobLink.updated_at >= start)
    rej_links = rej_links.all()

    rejection_map = {}
    for lnk in rej_links:
        reason = lnk.rejection_reason or "未填写"
        rejection_map[reason] = rejection_map.get(reason, 0) + 1

    top_reasons = sorted(rejection_map.items(), key=lambda x: x[1], reverse=True)[:3]
    top_reasons_str = "、".join([f"{r}（{c}次）" for r, c in top_reasons]) if top_reasons else "暂无"

    lines = [
        f"【招聘周报 · {today_str}】",
        f"本{period_label}新增简历 {new_candidates} 份，推进面试 {new_interviews} 场，入职 {new_hired} 人。",
        "",
        "岗位进展：",
    ]
    lines.extend(job_lines if job_lines else ["· 暂无进行中岗位"])
    lines.append("")
    lines.append(f"主要淘汰原因：{top_reasons_str}")

    return {"text": "\n".join(lines)}
