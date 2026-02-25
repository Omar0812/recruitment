from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import Job, CandidateJobLink, HistoryEntry

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

DEFAULT_STAGES = ["简历筛选", "电话初筛", "面试", "Offer", "已入职"]


class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    jd: Optional[str] = None
    persona: Optional[str] = None
    status: Optional[str] = "open"
    hr_owner: Optional[str] = None
    stages: Optional[List[str]] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    jd: Optional[str] = None
    persona: Optional[str] = None
    status: Optional[str] = None
    hr_owner: Optional[str] = None
    stages: Optional[List[str]] = None


def job_to_dict(job: Job, active_count: int = 0, last_activity: Optional[datetime] = None, stage_counts: Optional[dict] = None) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "department": job.department,
        "jd": job.jd,
        "persona": job.persona,
        "status": job.status,
        "hr_owner": job.hr_owner,
        "stages": job.stages or DEFAULT_STAGES,
        "active_count": active_count,
        "stage_counts": stage_counts or {},
        "last_activity": last_activity.isoformat() if last_activity else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.post("")
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    job = Job(
        title=data.title,
        department=data.department,
        jd=data.jd,
        persona=data.persona,
        status=data.status or "open",
        hr_owner=data.hr_owner,
        stages=data.stages or DEFAULT_STAGES,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_to_dict(job)


@router.get("")
def list_jobs(
    include_closed: bool = False,
    q: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Job)
    if not include_closed:
        query = query.filter(Job.status != "closed")
    if q:
        query = query.filter(
            or_(
                Job.title.ilike(f"%{q}%"),
                Job.department.ilike(f"%{q}%"),
                Job.hr_owner.ilike(f"%{q}%"),
            )
        )
    if department:
        query = query.filter(Job.department == department)
    jobs = query.order_by(Job.created_at.desc()).all()
    result = []
    for job in jobs:
        active_links = [lnk for lnk in job.candidate_links if lnk.outcome is None]
        last_activity = None
        if active_links:
            last_activity = max((lnk.updated_at for lnk in active_links if lnk.updated_at), default=None)
        stage_counts = {}
        for lnk in active_links:
            if lnk.stage:
                stage_counts[lnk.stage] = stage_counts.get(lnk.stage, 0) + 1
        result.append(job_to_dict(job, len(active_links), last_activity, stage_counts))
    return result


@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    active_links = [lnk for lnk in job.candidate_links if not lnk.outcome]
    return job_to_dict(job, len(active_links))


@router.patch("/{job_id}")
def update_job(job_id: int, data: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job_to_dict(job)
