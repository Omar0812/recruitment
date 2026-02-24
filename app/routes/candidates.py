from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import Candidate, HistoryEntry

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


class CandidateCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    education: Optional[str] = None
    school: Optional[str] = None
    city: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    years_exp: Optional[int] = None
    skill_tags: Optional[List[str]] = []
    source: Optional[str] = None
    notes: Optional[str] = None
    resume_path: Optional[str] = None


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    education: Optional[str] = None
    school: Optional[str] = None
    city: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    years_exp: Optional[int] = None
    skill_tags: Optional[List[str]] = None
    source: Optional[str] = None
    notes: Optional[str] = None


def candidate_to_dict(c: Candidate) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "age": c.age,
        "education": c.education,
        "school": c.school,
        "city": c.city,
        "last_company": c.last_company,
        "last_title": c.last_title,
        "years_exp": c.years_exp,
        "skill_tags": c.skill_tags or [],
        "source": c.source,
        "notes": c.notes,
        "resume_path": c.resume_path,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.post("")
def create_candidate(data: CandidateCreate, db: Session = Depends(get_db)):
    candidate = Candidate(**data.model_dump())
    db.add(candidate)
    db.flush()
    db.add(HistoryEntry(candidate_id=candidate.id, event_type="created", detail="候选人档案创建"))
    db.commit()
    db.refresh(candidate)
    return candidate_to_dict(candidate)


@router.get("")
def list_candidates(
    q: Optional[str] = Query(None),
    education: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate)
    if q:
        query = query.filter(
            or_(
                Candidate.name.ilike(f"%{q}%"),
                Candidate.phone.ilike(f"%{q}%"),
                Candidate.email.ilike(f"%{q}%"),
            )
        )
    if education:
        query = query.filter(Candidate.education.ilike(f"%{education}%"))
    candidates = query.order_by(Candidate.created_at.desc()).all()
    if tag:
        candidates = [c for c in candidates if tag in (c.skill_tags or [])]
    return [candidate_to_dict(c) for c in candidates]


@router.get("/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在")
    result = candidate_to_dict(c)
    result["history"] = [
        {
            "id": h.id,
            "event_type": h.event_type,
            "detail": h.detail,
            "job_id": h.job_id,
            "timestamp": h.timestamp.isoformat() if h.timestamp else None,
        }
        for h in sorted(c.history, key=lambda x: x.timestamp or datetime.min, reverse=True)
    ]
    result["job_links"] = [
        {
            "id": lnk.id,
            "job_id": lnk.job_id,
            "job_title": lnk.job.title if lnk.job else None,
            "stage": lnk.stage,
            "notes": lnk.notes,
            "outcome": lnk.outcome,
            "created_at": lnk.created_at.isoformat() if lnk.created_at else None,
        }
        for lnk in c.job_links
    ]
    return result


@router.patch("/{candidate_id}")
def update_candidate(candidate_id: int, data: CandidateUpdate, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return candidate_to_dict(c)
