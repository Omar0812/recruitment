from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import ActivityRecord, CandidateJobLink
from app.schemas import ActivityOut
from app.services.activities import (
    CHAIN_TYPES, _RETIRED_CHAIN_TYPES,
    derive_stage, sync_stage, build_payload, get_field,
)

router = APIRouter(prefix="/api/activities", tags=["activities"])


class ActivityCreate(BaseModel):
    link_id: int
    type: str
    stage: Optional[str] = None
    actor: Optional[str] = None
    comment: Optional[str] = None
    conclusion: Optional[str] = None
    rejection_reason: Optional[str] = None
    round: Optional[str] = None
    interview_time: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    salary: Optional[str] = None
    start_date: Optional[str] = None
    from_stage: Optional[str] = None
    to_stage: Optional[str] = None
    # offer compensation fields
    monthly_salary: Optional[int] = None
    salary_months: Optional[int] = None
    other_cash: Optional[str] = None


class ActivityUpdate(BaseModel):
    actor: Optional[str] = None
    comment: Optional[str] = None
    conclusion: Optional[str] = None
    rejection_reason: Optional[str] = None
    round: Optional[str] = None
    interview_time: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    salary: Optional[str] = None
    start_date: Optional[str] = None
    monthly_salary: Optional[int] = None
    salary_months: Optional[int] = None
    other_cash: Optional[str] = None


@router.get("")
def list_activities(link_id: int, db: Session = Depends(get_db)):
    records = db.query(ActivityRecord).filter(
        ActivityRecord.link_id == link_id
    ).order_by(ActivityRecord.created_at.asc()).all()
    return [ActivityOut.model_validate(r).model_dump() for r in records]


@router.post("")
def create_activity(data: ActivityCreate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == data.link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    if data.score is not None and not (1 <= data.score <= 5):
        raise HTTPException(status_code=400, detail="评分须在 1-5 之间")

    if data.type == "phone_screen":
        raise HTTPException(status_code=400, detail="phone_screen 类型已废弃，请使用 interview")

    if data.type == "background_check":
        if not data.conclusion:
            raise HTTPException(status_code=400, detail="背调结论为必填项")
        if data.conclusion not in ("通过", "不通过", "有瑕疵"):
            raise HTTPException(status_code=400, detail="背调结论须为：通过 / 不通过 / 有瑕疵")

    all_chain_types = CHAIN_TYPES | _RETIRED_CHAIN_TYPES
    if data.type in CHAIN_TYPES and data.type != "onboard":
        tail = (
            db.query(ActivityRecord)
            .filter(
                ActivityRecord.link_id == data.link_id,
                ActivityRecord.type.in_(all_chain_types),
            )
            .order_by(ActivityRecord.id.desc())
            .first()
        )
        if tail and tail.conclusion is None and tail.status not in ("completed", "cancelled"):
            raise HTTPException(status_code=400, detail="当前活动尚未完成，请先完成后再添加下一步")

    stage = data.stage
    if not stage:
        if data.type == "resume_review":
            stage = "简历筛选"
        elif data.type == "interview":
            stage = data.round or "面试"
        elif data.type == "offer":
            stage = "Offer"
        elif data.type == "background_check":
            stage = "背调"
        elif data.type == "onboard":
            stage = "入职确认"
        else:
            stage = lnk.stage or ""

    conclusion = data.conclusion
    status = data.status
    if data.type == "onboard":
        conclusion = "已入职"
        status = "completed"

    record = ActivityRecord(
        link_id=data.link_id,
        type=data.type,
        stage=stage,
        actor=data.actor,
        comment=data.comment,
        conclusion=conclusion,
        rejection_reason=data.rejection_reason,
        round=data.round,
        interview_time=data.interview_time,
        scheduled_at=data.scheduled_at,
        location=data.location,
        status=status,
        score=data.score,
        salary=data.salary,
        start_date=data.start_date,
        from_stage=data.from_stage,
        to_stage=data.to_stage,
        payload=build_payload(data.type, conclusion, status, data),
    )

    if data.type == "interview":
        parts = [p for p in [data.round, conclusion, data.comment] if p]
        record.embedding_text = " ".join(parts) if parts else None
    db.add(record)
    db.flush()
    sync_stage(data.link_id, db)

    if data.type == "onboard":
        lnk.outcome = "hired"
        lnk.state = "HIRED"
        lnk.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(record)
    return ActivityOut.model_validate(record).model_dump()


@router.patch("/{record_id}")
def update_activity(record_id: int, data: ActivityUpdate, db: Session = Depends(get_db)):
    record = db.query(ActivityRecord).filter(ActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    if data.score is not None and not (1 <= data.score <= 5):
        raise HTTPException(status_code=400, detail="评分须在 1-5 之间")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(record, field, val)
    if record.payload is not None:
        updated = data.model_dump(exclude_unset=True)
        record.payload = {**record.payload, **{k: v for k, v in updated.items() if k in record.payload}}
    sync_stage(record.link_id, db)
    db.commit()
    db.refresh(record)
    return ActivityOut.model_validate(record).model_dump()


@router.delete("/{record_id}")
def delete_activity(record_id: int, db: Session = Depends(get_db)):
    record = db.query(ActivityRecord).filter(ActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    link_id = record.link_id
    db.delete(record)
    db.flush()
    sync_stage(link_id, db)
    db.commit()
    return {"ok": True}
