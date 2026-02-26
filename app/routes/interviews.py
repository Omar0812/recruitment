from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import InterviewRecord, CandidateJobLink

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


class InterviewCreate(BaseModel):
    link_id: int
    round: Optional[str] = None
    interviewer: Optional[str] = None
    interview_time: Optional[str] = None
    score: Optional[int] = None
    comment: Optional[str] = None
    conclusion: Optional[str] = None
    status: Optional[str] = "completed"
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None


def record_to_dict(r: InterviewRecord) -> dict:
    return {
        "id": r.id,
        "link_id": r.link_id,
        "round": r.round,
        "interviewer": r.interviewer,
        "interview_time": r.interview_time,
        "score": r.score,
        "comment": r.comment,
        "conclusion": r.conclusion,
        "status": r.status or "completed",
        "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
        "location": r.location,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("")
def create_interview(data: InterviewCreate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == data.link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    if data.score is not None and not (1 <= data.score <= 5):
        raise HTTPException(status_code=400, detail="评分须在 1-5 之间")
    record = InterviewRecord(
        link_id=data.link_id,
        round=data.round,
        interviewer=data.interviewer,
        interview_time=data.interview_time,
        score=data.score,
        comment=data.comment,
        conclusion=data.conclusion,
        status=data.status or "completed",
        scheduled_at=data.scheduled_at,
        location=data.location,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record_to_dict(record)


@router.get("")
def list_interviews(link_id: int, db: Session = Depends(get_db)):
    records = db.query(InterviewRecord).filter(
        InterviewRecord.link_id == link_id
    ).order_by(InterviewRecord.created_at.desc()).all()
    return [record_to_dict(r) for r in records]


class InterviewUpdate(BaseModel):
    round: Optional[str] = None
    interviewer: Optional[str] = None
    interview_time: Optional[str] = None
    score: Optional[int] = None
    comment: Optional[str] = None
    conclusion: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None


@router.patch("/{record_id}")
def update_interview(record_id: int, data: InterviewUpdate, db: Session = Depends(get_db)):
    record = db.query(InterviewRecord).filter(InterviewRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    if data.score is not None and not (1 <= data.score <= 5):
        raise HTTPException(status_code=400, detail="评分须在 1-5 之间")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(record, field, val)
    db.commit()
    db.refresh(record)
    return record_to_dict(record)


@router.delete("/{record_id}")
def delete_interview(record_id: int, db: Session = Depends(get_db)):
    record = db.query(InterviewRecord).filter(InterviewRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(record)
    db.commit()
    return {"ok": True}
