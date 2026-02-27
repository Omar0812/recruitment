from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta

from app.database import get_db
from app.models import ActivityRecord, CandidateJobLink, Candidate

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _start_of_week() -> datetime:
    """Return Monday 00:00 of current week (local time treated as UTC)."""
    now = datetime.utcnow()
    days_since_monday = now.weekday()  # 0=Mon
    return (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)


def _get_last_interview_summary(link_id: int, exclude_activity_id: int, db: Session):
    """Return summary of the most recent completed interview for this link."""
    rec = (
        db.query(ActivityRecord)
        .filter(
            ActivityRecord.link_id == link_id,
            ActivityRecord.type == "interview",
            ActivityRecord.status == "completed",
            ActivityRecord.id != exclude_activity_id,
        )
        .order_by(ActivityRecord.id.desc())
        .first()
    )
    if not rec:
        return None
    p = rec.payload or {}
    return {
        "round": p.get("round") or rec.round,
        "score": p.get("score") or rec.score,
        "conclusion": p.get("conclusion") or rec.conclusion,
        "comment": p.get("comment") or rec.comment,
    }


@router.get("/today")
def get_today(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = today_start + timedelta(days=2)
    week_start = _start_of_week()

    today_items = []
    p0_link_ids = set()

    # ── P0-A: 今天/明天有面试安排 ─────────────────────────────────────────────
    interviews_today = (
        db.query(ActivityRecord)
        .join(CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(
            ActivityRecord.type == "interview",
            ActivityRecord.status == "scheduled",
            ActivityRecord.scheduled_at >= today_start,
            ActivityRecord.scheduled_at < tomorrow_end,
            CandidateJobLink.state == "IN_PROGRESS",
            Candidate.deleted_at.is_(None),
        )
        .options(
            joinedload(ActivityRecord.link).joinedload(CandidateJobLink.candidate),
            joinedload(ActivityRecord.link).joinedload(CandidateJobLink.job),
        )
        .order_by(ActivityRecord.scheduled_at.asc())
        .all()
    )

    for r in interviews_today:
        lnk = r.link
        cand = lnk.candidate if lnk else None
        job = lnk.job if lnk else None
        p = r.payload or {}
        p0_link_ids.add(lnk.id if lnk else None)
        today_items.append({
            "priority": "P0",
            "type": "interview_today",
            "link_id": lnk.id if lnk else None,
            "activity_id": r.id,
            "candidate_name": cand.name if cand else None,
            "job_title": job.title if job else None,
            "stage": lnk.stage if lnk else None,
            "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
            "interviewer": p.get("actor") or r.actor,
            "location": p.get("location") or r.location,
            "last_interview_summary": _get_last_interview_summary(r.link_id, r.id, db),
        })

    # ── P0-B: Offer 超 5 天无结论 ────────────────────────────────────────────
    cutoff_offer = now - timedelta(days=5)
    offers_waiting = (
        db.query(ActivityRecord)
        .join(CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(
            ActivityRecord.type == "offer",
            ActivityRecord.created_at < cutoff_offer,
            CandidateJobLink.state == "IN_PROGRESS",
            Candidate.deleted_at.is_(None),
        )
        .options(
            joinedload(ActivityRecord.link).joinedload(CandidateJobLink.candidate),
            joinedload(ActivityRecord.link).joinedload(CandidateJobLink.job),
        )
        .all()
    )

    for r in offers_waiting:
        p = r.payload or {}
        conclusion = p.get("conclusion") or r.conclusion
        if conclusion:
            continue  # already has conclusion
        lnk = r.link
        cand = lnk.candidate if lnk else None
        job = lnk.job if lnk else None
        p0_link_ids.add(lnk.id if lnk else None)
        offer_days = (now - r.created_at).days
        today_items.append({
            "priority": "P0",
            "type": "offer_waiting",
            "link_id": lnk.id if lnk else None,
            "activity_id": r.id,
            "candidate_name": cand.name if cand else None,
            "job_title": job.title if job else None,
            "offer_days": offer_days,
            "offer_created_at": r.created_at.isoformat() if r.created_at else None,
            "monthly_salary": p.get("monthly_salary"),
        })

    # ── P1-A: 面试结束超 2 天未填面评 ────────────────────────────────────────
    cutoff_iv = now - timedelta(days=2)
    interviews_missing = (
        db.query(ActivityRecord)
        .join(CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(
            ActivityRecord.type == "interview",
            ActivityRecord.status == "scheduled",
            ActivityRecord.scheduled_at < cutoff_iv,
            ActivityRecord.scheduled_at.isnot(None),
            CandidateJobLink.state == "IN_PROGRESS",
            Candidate.deleted_at.is_(None),
        )
        .options(
            joinedload(ActivityRecord.link).joinedload(CandidateJobLink.candidate),
            joinedload(ActivityRecord.link).joinedload(CandidateJobLink.job),
        )
        .all()
    )

    for r in interviews_missing:
        lnk = r.link
        if lnk and lnk.id in p0_link_ids:
            continue
        cand = lnk.candidate if lnk else None
        job = lnk.job if lnk else None
        p = r.payload or {}
        days_missing = (now - r.scheduled_at).days
        today_items.append({
            "priority": "P1",
            "type": "interview_feedback_missing",
            "link_id": lnk.id if lnk else None,
            "activity_id": r.id,
            "candidate_name": cand.name if cand else None,
            "job_title": job.title if job else None,
            "stage": p.get("round") or r.round or lnk.stage if lnk else None,
            "days_missing": days_missing,
            "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
        })

    # ── P1-B: 流程停滞超 5 天 ────────────────────────────────────────────────
    cutoff_stale = now - timedelta(days=5)
    stale_links = (
        db.query(CandidateJobLink)
        .join(Candidate, CandidateJobLink.candidate_id == Candidate.id)
        .filter(
            CandidateJobLink.state == "IN_PROGRESS",
            CandidateJobLink.updated_at < cutoff_stale,
            Candidate.deleted_at.is_(None),
        )
        .options(
            joinedload(CandidateJobLink.candidate),
            joinedload(CandidateJobLink.job),
        )
        .all()
    )

    for lnk in stale_links:
        if lnk.id in p0_link_ids:
            continue
        cand = lnk.candidate
        job = lnk.job
        days_stale = (now - lnk.updated_at).days if lnk.updated_at else 0
        today_items.append({
            "priority": "P1",
            "type": "pipeline_stale",
            "link_id": lnk.id,
            "candidate_name": cand.name if cand else None,
            "job_title": job.title if job else None,
            "stage": lnk.stage,
            "days_stale": days_stale,
            "last_updated": lnk.updated_at.isoformat() if lnk.updated_at else None,
        })

    # ── P2: 建档未分配岗位 ────────────────────────────────────────────────────
    # Candidates who have never been assigned to any job (no job_links at all)
    all_candidates = (
        db.query(Candidate)
        .filter(Candidate.deleted_at.is_(None))
        .options(joinedload(Candidate.job_links))
        .all()
    )
    unassigned = []
    for cand in all_candidates:
        if not cand.job_links:  # 从未分配过任何岗位
            unassigned.append({
                "id": cand.id,
                "name": cand.name,
                "created_at": cand.created_at.isoformat() if cand.created_at else None,
            })

    if unassigned:
        today_items.append({
            "priority": "P2",
            "type": "unassigned_candidates",
            "candidates": unassigned,
        })

    # ── Week summary ──────────────────────────────────────────────────────────
    in_progress = db.query(CandidateJobLink).join(Candidate).filter(
        CandidateJobLink.state == "IN_PROGRESS",
        Candidate.deleted_at.is_(None),
    ).count()

    interviews_this_week = db.query(ActivityRecord).join(
        CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id
    ).filter(
        ActivityRecord.type == "interview",
        ActivityRecord.status == "scheduled",
        ActivityRecord.scheduled_at >= week_start,
    ).count()

    offers_pending = db.query(ActivityRecord).join(
        CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id
    ).filter(
        ActivityRecord.type == "offer",
        CandidateJobLink.state == "IN_PROGRESS",
    ).count()
    # subtract those with conclusion
    for r in db.query(ActivityRecord).join(
        CandidateJobLink, ActivityRecord.link_id == CandidateJobLink.id
    ).filter(
        ActivityRecord.type == "offer",
        CandidateJobLink.state == "IN_PROGRESS",
    ).all():
        p = r.payload or {}
        if p.get("conclusion") or r.conclusion:
            offers_pending -= 1

    hired_this_week = db.query(CandidateJobLink).filter(
        CandidateJobLink.state == "HIRED",
        CandidateJobLink.updated_at >= week_start,
    ).count()

    return {
        "today": today_items,
        "week_summary": {
            "in_progress": in_progress,
            "interviews_this_week": interviews_this_week,
            "offers_pending": max(0, offers_pending),
            "hired_this_week": hired_this_week,
        },
    }
