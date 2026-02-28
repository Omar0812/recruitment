from sqlalchemy.orm import Session

from app.models import ActivityRecord, CandidateJobLink
from datetime import datetime

CHAIN_TYPES = {"resume_review", "interview", "offer", "onboard", "background_check"}
_RETIRED_CHAIN_TYPES = {"phone_screen"}

STAGE_LABEL = {
    "resume_review": "简历筛选",
    "phone_screen": "电话初筛",
    "offer": "Offer",
    "onboard": "入职确认",
}


def derive_stage(link_id: int, db: Session) -> str:
    """从活动链尾推导 stage 标签。"""
    all_chain_types = CHAIN_TYPES | _RETIRED_CHAIN_TYPES
    last = (
        db.query(ActivityRecord)
        .filter(
            ActivityRecord.link_id == link_id,
            ActivityRecord.type.in_(all_chain_types),
        )
        .order_by(ActivityRecord.id.desc())
        .first()
    )
    if not last:
        return "待处理"
    if last.type == "interview":
        return last.round or "面试"
    return STAGE_LABEL.get(last.type, last.type)


def sync_stage(link_id: int, db: Session):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if lnk:
        lnk.stage = derive_stage(link_id, db)
        lnk.updated_at = datetime.utcnow()


def get_field(r: ActivityRecord, field: str, default=None):
    """Read from payload first, fallback to sparse column."""
    p = r.payload or {}
    if field in p:
        return p[field]
    return getattr(r, field, default)


def build_payload(type_: str, conclusion, status, data) -> dict:
    """Build type-specific payload dict from request data object."""
    if type_ == "interview":
        return {
            "round": data.round,
            "score": data.score,
            "conclusion": conclusion,
            "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
            "location": data.location,
            "status": status,
            "comment": data.comment,
        }
    if type_ == "offer":
        return {
            "monthly_salary": data.monthly_salary,
            "salary_months": data.salary_months,
            "other_cash": data.other_cash,
            "salary": data.salary,
            "start_date": data.start_date,
            "conclusion": conclusion,
            "comment": data.comment,
        }
    if type_ == "background_check":
        return {
            "conclusion": conclusion,
            "notes": data.comment,
        }
    if type_ == "onboard":
        return {
            "conclusion": conclusion,
            "start_date": data.start_date,
            "monthly_salary": data.monthly_salary,
        }
    return {"conclusion": conclusion, "comment": data.comment}
