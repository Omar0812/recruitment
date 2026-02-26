from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import CandidateJobLink, Job, Candidate, HistoryEntry, InterviewRecord

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


class InterviewRoundsUpdate(BaseModel):
    interview_rounds: int


def link_to_dict(lnk: CandidateJobLink) -> dict:
    return {
        "id": lnk.id,
        "candidate_id": lnk.candidate_id,
        "job_id": lnk.job_id,
        "candidate_name": lnk.candidate.name if lnk.candidate else None,
        "stage": lnk.stage,
        "notes": lnk.notes,
        "outcome": lnk.outcome,
        "rejection_reason": lnk.rejection_reason,
        "interview_rounds": lnk.interview_rounds or 1,
        "created_at": lnk.created_at.isoformat() if lnk.created_at else None,
        "updated_at": lnk.updated_at.isoformat() if lnk.updated_at else None,
        "days_since_update": (datetime.utcnow() - lnk.updated_at).days if lnk.updated_at else None,
    }


@router.post("/link")
def link_candidate(data: LinkCreate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    candidate = db.query(Candidate).filter(Candidate.id == data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="候选人不存在")

    existing = db.query(CandidateJobLink).filter(
        CandidateJobLink.candidate_id == data.candidate_id,
        CandidateJobLink.outcome.is_(None),
    ).first()
    if existing:
        current_job = existing.job.title if existing.job else f"岗位#{existing.job_id}"
        raise HTTPException(status_code=400, detail=f"该候选人已在「{current_job}」流程中，请先结束再投递新岗位")

    stage = data.stage or (job.stages[0] if job.stages else "简历筛选")
    lnk = CandidateJobLink(candidate_id=data.candidate_id, job_id=data.job_id, stage=stage)
    db.add(lnk)
    db.flush()
    db.add(HistoryEntry(
        candidate_id=data.candidate_id,
        job_id=data.job_id,
        event_type="stage_change",
        detail=f"加入岗位「{job.title}」，阶段：{stage}",
    ))
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


@router.patch("/link/{link_id}/stage")
def update_stage(link_id: int, data: StageUpdate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    old_stage = lnk.stage
    lnk.stage = data.stage
    lnk.updated_at = datetime.utcnow()
    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=lnk.job_id,
        event_type="stage_change",
        detail=f"阶段变更：{old_stage} → {data.stage}",
    ))
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


@router.patch("/link/{link_id}/outcome")
def update_outcome(link_id: int, data: OutcomeUpdate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk.outcome = data.outcome
    if data.rejection_reason:
        lnk.rejection_reason = data.rejection_reason
    lnk.updated_at = datetime.utcnow()
    label = "淘汰" if data.outcome == "rejected" else "退出"
    reason_str = f"（{data.rejection_reason}）" if data.rejection_reason else ""
    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=lnk.job_id,
        event_type="outcome",
        detail=f"结果：{label}{reason_str}",
    ))
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


@router.patch("/link/{link_id}/withdraw")
def withdraw_candidate(link_id: int, data: WithdrawUpdate = WithdrawUpdate(), db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(
        CandidateJobLink.id == link_id,
        CandidateJobLink.candidate.has(Candidate.deleted_at.is_(None))
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk.outcome = "withdrawn"
    if data.reason:
        lnk.rejection_reason = data.reason
    lnk.updated_at = datetime.utcnow()
    reason_str = f"（{data.reason}）" if data.reason else ""
    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=lnk.job_id,
        event_type="outcome",
        detail=f"结果：候选人退出{reason_str}",
    ))
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


@router.patch("/link/{link_id}/hire")
def hire_candidate(link_id: int, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(
        CandidateJobLink.id == link_id,
        CandidateJobLink.candidate.has(Candidate.deleted_at.is_(None))
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk.outcome = "hired"
    lnk.updated_at = datetime.utcnow()
    job_title = lnk.job.title if lnk.job else f"岗位#{lnk.job_id}"
    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=lnk.job_id,
        event_type="outcome",
        detail=f"结果：已入职「{job_title}」",
    ))
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


class TransferJob(BaseModel):
    new_job_id: int
    keep_records: bool = False


@router.patch("/link/{link_id}/transfer")
def transfer_job(link_id: int, data: TransferJob, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(
        CandidateJobLink.id == link_id,
        CandidateJobLink.candidate.has(Candidate.deleted_at.is_(None))
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    new_job = db.query(Job).filter(Job.id == data.new_job_id).first()
    if not new_job:
        raise HTTPException(status_code=404, detail="目标岗位不存在")

    # Close old link
    lnk.outcome = "withdrawn"
    lnk.updated_at = datetime.utcnow()

    # Create new link
    new_stage = new_job.stages[0] if new_job.stages else "简历筛选"
    new_lnk = CandidateJobLink(
        candidate_id=lnk.candidate_id,
        job_id=data.new_job_id,
        stage=new_stage,
    )
    db.add(new_lnk)
    db.flush()

    if data.keep_records:
        db.query(InterviewRecord).filter(
            InterviewRecord.link_id == link_id
        ).update({"link_id": new_lnk.id})

    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=data.new_job_id,
        event_type="stage_change",
        detail=f"转移至岗位「{new_job.title}」，阶段：{new_stage}",
    ))
    db.commit()
    db.refresh(new_lnk)
    return link_to_dict(new_lnk)



@router.patch("/link/{link_id}/notes")
def update_notes(link_id: int, data: NotesUpdate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    lnk.notes = data.notes
    lnk.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


@router.patch("/link/{link_id}/interview-rounds")
def update_interview_rounds(link_id: int, data: InterviewRoundsUpdate, db: Session = Depends(get_db)):
    lnk = db.query(CandidateJobLink).filter(CandidateJobLink.id == link_id).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    rounds = max(1, data.interview_rounds)
    lnk.interview_rounds = rounds
    lnk.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lnk)
    return link_to_dict(lnk)


@router.get("/active")
def get_active_pipeline(db: Session = Depends(get_db)):
    links = db.query(CandidateJobLink).join(Candidate).filter(
        CandidateJobLink.outcome == None,
        Candidate.deleted_at.is_(None)
    ).all()
    result = []
    for lnk in links:
        result.append({
            "id": lnk.id,
            "candidate_id": lnk.candidate_id,
            "candidate_name": lnk.candidate.name if lnk.candidate else None,
            "job_id": lnk.job_id,
            "job_title": lnk.job.title if lnk.job else None,
            "job_stages": lnk.job.stages or ["简历筛选", "电话初筛", "面试", "Offer", "已入职"] if lnk.job else [],
            "stage": lnk.stage,
            "interview_rounds": lnk.interview_rounds or 1,
            "starred": bool(lnk.candidate.starred) if lnk.candidate else False,
            "days_since_update": (datetime.utcnow() - lnk.updated_at).days if lnk.updated_at else None,
            "notes": lnk.notes,
        })
    return result


@router.get("/jobs/{job_id}/pipeline")
def get_pipeline(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    active_links = [lnk for lnk in job.candidate_links if lnk.outcome is None and (lnk.candidate is None or lnk.candidate.deleted_at is None)]
    stages = job.stages or []
    pipeline = {stage: [] for stage in stages}
    unmatched = []
    for lnk in active_links:
        if lnk.stage in pipeline:
            pipeline[lnk.stage].append(link_to_dict(lnk))
        else:
            unmatched.append(link_to_dict(lnk))
    return {"stages": stages, "pipeline": pipeline, "unmatched": unmatched}


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """返回数据分析所需的聚合数据"""
    all_links = db.query(CandidateJobLink).join(Candidate).filter(
        Candidate.deleted_at.is_(None)
    ).all()

    # 各阶段人数（活跃）
    stage_counts = {}
    for lnk in all_links:
        if lnk.outcome is None and lnk.stage:
            stage_counts[lnk.stage] = stage_counts.get(lnk.stage, 0) + 1

    # 岗位汇总
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

    # 淘汰原因分布
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
