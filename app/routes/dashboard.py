from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Job, CandidateJobLink, Candidate
from app import ai_client

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    stale_threshold = now - timedelta(days=3)

    # 超时未跟进候选人
    stale_links = (
        db.query(CandidateJobLink)
        .filter(CandidateJobLink.outcome.is_(None))
        .filter(CandidateJobLink.updated_at < stale_threshold)
        .all()
    )
    stale_candidates = [
        {
            "link_id": lnk.id,
            "candidate_id": lnk.candidate_id,
            "candidate_name": lnk.candidate.name if lnk.candidate else "",
            "job_id": lnk.job_id,
            "job_title": lnk.job.title if lnk.job else "",
            "stage": lnk.stage,
            "days_stale": (now - lnk.updated_at).days if lnk.updated_at else 0,
        }
        for lnk in stale_links
    ]

    # 岗位健康度
    jobs = db.query(Job).filter(Job.status == "open").all()
    job_health = []
    for job in jobs:
        active_links = [lnk for lnk in job.candidate_links if not lnk.outcome]
        last_activity = None
        if active_links:
            last_activity = max((lnk.updated_at for lnk in active_links if lnk.updated_at), default=None)
        days_inactive = (now - last_activity).days if last_activity else None
        stage_counts = {}
        for lnk in active_links:
            stage_counts[lnk.stage] = stage_counts.get(lnk.stage, 0) + 1
        job_health.append({
            "job_id": job.id,
            "title": job.title,
            "active_count": len(active_links),
            "stage_counts": stage_counts,
            "days_inactive": days_inactive,
            "is_stale": days_inactive is not None and days_inactive >= 5,
        })

    return {
        "stale_candidates": stale_candidates,
        "job_health": job_health,
        "ai_configured": ai_client._is_configured(),
    }


@router.post("/insights")
def get_insights(db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.status == "open").all()
    lines = []
    for job in jobs:
        active = [lnk for lnk in job.candidate_links if not lnk.outcome]
        stage_counts = {}
        for lnk in active:
            stage_counts[lnk.stage] = stage_counts.get(lnk.stage, 0) + 1
        lines.append(f"岗位「{job.title}」：活跃候选人{len(active)}人，各阶段分布：{stage_counts}")

    summary = "\n".join(lines) if lines else "暂无活跃岗位数据"
    insights = ai_client.generate_insights(summary)
    return {"insights": insights}
