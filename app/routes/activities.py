from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import ActivityRecord, CandidateJobLink

router = APIRouter(prefix="/api/activities", tags=["activities"])

CHAIN_TYPES = {"resume_review", "interview", "phone_screen", "offer"}

STAGE_LABEL = {
    "resume_review": "简历筛选",
    "phone_screen": "电话初筛",
    "offer": "Offer",
}


def derive_stage(link_id: int, db: Session) -> str:
    """从活动链尾推导 stage 标签。"""
    last = (
        db.query(ActivityRecord)
        .filter(
            ActivityRecord.link_id == link_id,
            ActivityRecord.type.in_(CHAIN_TYPES),
        )
        .order_by(ActivityRecord.id.desc())
        .first()
    )
    if not last:
        return "待处理"
    if last.type == "interview":
        return last.round or "面试"
    return STAGE_LABEL.get(last.type, last.type)


def _sync_stage(link_id: int, db: Session):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if lnk:
        lnk.stage = derive_stage(link_id, db)
        lnk.updated_at = datetime.utcnow()


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


def record_to_dict(r: ActivityRecord) -> dict:
    return {
        "id": r.id,
        "link_id": r.link_id,
        "type": r.type,
        "stage": r.stage,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "actor": r.actor,
        "comment": r.comment,
        "conclusion": r.conclusion,
        "rejection_reason": r.rejection_reason,
        "round": r.round,
        "interview_time": r.interview_time,
        "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
        "location": r.location,
        "status": r.status,
        "score": r.score,
        "salary": r.salary,
        "start_date": r.start_date,
        "from_stage": r.from_stage,
        "to_stage": r.to_stage,
    }


@router.get("")
def list_activities(link_id: int, db: Session = Depends(get_db)):
    records = db.query(ActivityRecord).filter(
        ActivityRecord.link_id == link_id
    ).order_by(ActivityRecord.created_at.asc()).all()
    return [record_to_dict(r) for r in records]


@router.post("")
def create_activity(data: ActivityCreate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == data.link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    if data.score is not None and not (1 <= data.score <= 5):
        raise HTTPException(status_code=400, detail="评分须在 1-5 之间")

    # 链尾约束：note 类型跳过校验
    if data.type in CHAIN_TYPES:
        tail = (
            db.query(ActivityRecord)
            .filter(
                ActivityRecord.link_id == data.link_id,
                ActivityRecord.type.in_(CHAIN_TYPES),
            )
            .order_by(ActivityRecord.id.desc())
            .first()
        )
        if tail and tail.conclusion is None and tail.status not in ("completed", "cancelled"):
            raise HTTPException(status_code=400, detail="当前活动尚未完成，请先完成后再添加下一步")

    # stage 自动填充
    stage = data.stage
    if not stage:
        if data.type == "resume_review":
            stage = "简历筛选"
        elif data.type == "interview":
            stage = data.round or "面试"
        elif data.type == "phone_screen":
            stage = "电话初筛"
        elif data.type == "offer":
            stage = "Offer"
        else:
            stage = lnk.stage or ""

    record = ActivityRecord(
        link_id=data.link_id,
        type=data.type,
        stage=stage,
        actor=data.actor,
        comment=data.comment,
        conclusion=data.conclusion,
        rejection_reason=data.rejection_reason,
        round=data.round,
        interview_time=data.interview_time,
        scheduled_at=data.scheduled_at,
        location=data.location,
        status=data.status,
        score=data.score,
        salary=data.salary,
        start_date=data.start_date,
        from_stage=data.from_stage,
        to_stage=data.to_stage,
    )
    db.add(record)
    db.flush()
    _sync_stage(data.link_id, db)
    db.commit()
    db.refresh(record)
    return record_to_dict(record)


@router.patch("/{record_id}")
def update_activity(record_id: int, data: ActivityUpdate, db: Session = Depends(get_db)):
    record = db.query(ActivityRecord).filter(ActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    if data.score is not None and not (1 <= data.score <= 5):
        raise HTTPException(status_code=400, detail="评分须在 1-5 之间")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(record, field, val)
    _sync_stage(record.link_id, db)
    db.commit()
    db.refresh(record)
    return record_to_dict(record)


@router.delete("/{record_id}")
def delete_activity(record_id: int, db: Session = Depends(get_db)):
    record = db.query(ActivityRecord).filter(ActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    link_id = record.link_id
    db.delete(record)
    db.flush()
    _sync_stage(link_id, db)
    db.commit()
    return {"ok": True}
