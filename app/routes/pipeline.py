from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import CandidateJobLink, Job, Candidate
from app.schemas import LinkOut
from app.services import pipeline as pipeline_svc

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class LinkCreate(BaseModel):
    candidate_id: int
    job_id: int
    stage: Optional[str] = None


class StageUpdate(BaseModel):
    stage: str


class OutcomeUpdate(BaseModel):
    outcome: str  # rejected / withdrawn
    rejection_reason: Optional[str] = None


class WithdrawUpdate(BaseModel):
    reason: Optional[str] = None


class NotesUpdate(BaseModel):
    notes: str


class TransferJob(BaseModel):
    new_job_id: int
    keep_records: bool = False


@router.post("/link")
def link_candidate(data: LinkCreate, db: Session = Depends(get_db)):
    lnk = pipeline_svc.link_candidate(db, data.candidate_id, data.job_id)
    return LinkOut.model_validate(lnk).model_dump()


@router.patch("/link/{link_id}/stage")
def update_stage(link_id: int, data: StageUpdate, db: Session = Depends(get_db)):
    raise HTTPException(status_code=410, detail="stage 手动更新已废弃，阶段由活动链自动派生")


@router.patch("/link/{link_id}/outcome")
def update_outcome(link_id: int, data: OutcomeUpdate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk = pipeline_svc.resolve_outcome(db, lnk, data.outcome, data.rejection_reason)
    return LinkOut.model_validate(lnk).model_dump()


@router.patch("/link/{link_id}/withdraw")
def withdraw_candidate(link_id: int, data: WithdrawUpdate = WithdrawUpdate(), db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(
        CandidateJobLink.id == link_id,
        CandidateJobLink.candidate.has(Candidate.deleted_at.is_(None))
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk = pipeline_svc.resolve_outcome(db, lnk, "withdrawn", data.reason)
    return LinkOut.model_validate(lnk).model_dump()


@router.patch("/link/{link_id}/hire")
def hire_candidate(link_id: int, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(
        CandidateJobLink.id == link_id,
        CandidateJobLink.candidate.has(Candidate.deleted_at.is_(None))
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk = pipeline_svc.hire_candidate(db, lnk)
    return LinkOut.model_validate(lnk).model_dump()


@router.patch("/link/{link_id}/transfer")
def transfer_job(link_id: int, data: TransferJob, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(
        CandidateJobLink.id == link_id,
        CandidateJobLink.candidate.has(Candidate.deleted_at.is_(None))
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    new_lnk = pipeline_svc.transfer_job(db, lnk, data.new_job_id)
    return LinkOut.model_validate(new_lnk).model_dump()


@router.patch("/link/{link_id}/notes")
def update_notes(link_id: int, data: NotesUpdate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk.notes = data.notes
    lnk.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lnk)
    return LinkOut.model_validate(lnk).model_dump()


@router.get("/active")
def get_active_pipeline(db: Session = Depends(get_db)):
    links = db.query(CandidateJobLink).join(Candidate).filter(
        CandidateJobLink.outcome.is_(None),
        Candidate.deleted_at.is_(None)
    ).options(
        joinedload(CandidateJobLink.candidate).joinedload(Candidate.supplier),
        joinedload(CandidateJobLink.job),
    ).all()
    result = []
    for lnk in links:
        supplier = lnk.candidate.supplier if lnk.candidate else None
        result.append({
            "id": lnk.id,
            "candidate_id": lnk.candidate_id,
            "candidate_name": lnk.candidate.name if lnk.candidate else None,
            "job_id": lnk.job_id,
            "job_title": lnk.job.title if lnk.job else None,
            "stage": lnk.stage,
            "state": lnk.state,
            "starred": bool(lnk.candidate.starred) if lnk.candidate else False,
            "days_since_update": (datetime.utcnow() - lnk.updated_at).days if lnk.updated_at else None,
            "notes": lnk.notes,
            "supplier_name": supplier.name if supplier else None,
        })
    return result


@router.get("/hired")
def get_hired_pipeline(db: Session = Depends(get_db)):
    links = db.query(CandidateJobLink).join(Candidate).filter(
        CandidateJobLink.outcome == "hired",
        Candidate.deleted_at.is_(None)
    ).options(
        joinedload(CandidateJobLink.candidate).joinedload(Candidate.supplier),
        joinedload(CandidateJobLink.job),
        joinedload(CandidateJobLink.activity_records),
    ).all()
    result = []
    for lnk in links:
        onboard = next((r for r in lnk.activity_records if r.type == "onboard"), None)
        # offer 月薪：优先读最新 offer 的 payload.monthly_salary
        offer_acts = sorted(
            [r for r in lnk.activity_records if r.type == "offer"],
            key=lambda r: r.created_at or datetime.min,
        )
        latest_offer = offer_acts[-1] if offer_acts else None
        offer_monthly = None
        if latest_offer:
            p = latest_offer.payload or {}
            offer_monthly = p.get("monthly_salary") or latest_offer.salary

        # onboard 月薪和入职日期：优先 payload
        onboard_monthly = None
        start_date = None
        if onboard:
            p = onboard.payload or {}
            onboard_monthly = p.get("monthly_salary")
            start_date = p.get("start_date") or onboard.start_date

        monthly_salary = onboard_monthly or offer_monthly

        # supplier 信息
        supplier = lnk.candidate.supplier if lnk.candidate else None
        supplier_name = supplier.name if supplier else None
        guarantee_days = supplier.fee_guarantee_days if supplier else None

        result.append({
            "id": lnk.id,
            "candidate_id": lnk.candidate_id,
            "candidate_name": lnk.candidate.name if lnk.candidate else None,
            "job_id": lnk.job_id,
            "job_title": lnk.job.title if lnk.job else None,
            "state": lnk.state,
            "start_date": start_date,
            "hired_at": lnk.updated_at.isoformat() if lnk.updated_at else None,
            "source": lnk.candidate.source if lnk.candidate else None,
            "monthly_salary": monthly_salary,
            "supplier_name": supplier_name,
            "guarantee_days": guarantee_days,
        })
    return result


@router.get("/jobs/{job_id}/pipeline")
def get_pipeline(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    active_links = [lnk for lnk in job.candidate_links if lnk.outcome is None and (lnk.candidate is None or lnk.candidate.deleted_at is None)]
    pipeline = {}
    for lnk in active_links:
        stage = lnk.stage or "待处理"
        if stage not in pipeline:
            pipeline[stage] = []
        pipeline[stage].append(LinkOut.model_validate(lnk).model_dump())
    stages = list(pipeline.keys())
    return {"stages": stages, "pipeline": pipeline, "unmatched": []}


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    all_links = db.query(CandidateJobLink).join(Candidate).filter(
        Candidate.deleted_at.is_(None)
    ).all()

    stage_counts = {}
    for lnk in all_links:
        if lnk.outcome is None and lnk.stage:
            stage_counts[lnk.stage] = stage_counts.get(lnk.stage, 0) + 1

    job_stats = {}
    for lnk in all_links:
        jid = lnk.job_id
        title = lnk.job.title if lnk.job else f"岗位#{jid}"
        if jid not in job_stats:
            job_stats[jid] = {"title": title, "total": 0, "active": 0, "rejected": 0, "offer": 0}
        job_stats[jid]["total"] += 1
        if lnk.outcome is None:
            job_stats[jid]["active"] += 1
            if lnk.stage and "offer" in lnk.stage.lower():
                job_stats[jid]["offer"] += 1
        elif lnk.outcome == "rejected":
            job_stats[jid]["rejected"] += 1

    rejection_reasons = {}
    for lnk in all_links:
        if lnk.outcome == "rejected":
            reason = lnk.rejection_reason or "未填写"
            rejection_reasons[reason] = rejection_reasons.get(reason, 0) + 1

    return {
        "stage_counts": stage_counts,
        "job_stats": list(job_stats.values()),
        "rejection_reasons": rejection_reasons,
    }
