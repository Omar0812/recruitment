from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import ActivityRecord, Candidate, CandidateJobLink, HistoryEntry, Job
from app.services.activities import sync_stage


def link_candidate(db: Session, candidate_id: int, job_id: int) -> CandidateJobLink:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="候选人不存在")

    if candidate.blacklisted:
        raise HTTPException(status_code=400, detail="候选人已列入黑名单，无法推进流程")

    existing = db.query(CandidateJobLink).filter(
        CandidateJobLink.candidate_id == candidate_id,
        CandidateJobLink.outcome.is_(None),
    ).first()
    if existing:
        current_job = existing.job.title if existing.job else f"岗位#{existing.job_id}"
        raise HTTPException(
            status_code=400,
            detail=f"该候选人已在「{current_job}」流程中，请先结束再投递新岗位"
        )

    lnk = CandidateJobLink(
        candidate_id=candidate_id,
        job_id=job_id,
        stage="简历筛选",
        state="IN_PROGRESS",
    )
    db.add(lnk)
    db.flush()
    db.add(ActivityRecord(
        link_id=lnk.id,
        type="resume_review",
        stage="简历筛选",
        status="pending",
    ))
    db.add(HistoryEntry(
        candidate_id=candidate_id,
        job_id=job_id,
        event_type="stage_change",
        detail=f"加入岗位「{job.title}」",
    ))
    db.commit()
    db.refresh(lnk)
    return lnk


def resolve_outcome(
    db: Session,
    lnk: CandidateJobLink,
    outcome: str,
    rejection_reason: Optional[str] = None,
) -> CandidateJobLink:
    lnk.outcome = outcome
    if outcome == "rejected":
        lnk.state = "REJECTED"
    elif outcome == "withdrawn":
        lnk.state = "WITHDRAWN"
    if rejection_reason:
        lnk.rejection_reason = rejection_reason
    lnk.updated_at = datetime.utcnow()
    label = "淘汰" if outcome == "rejected" else "退出"
    reason_str = f"（{rejection_reason}）" if rejection_reason else ""
    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=lnk.job_id,
        event_type="outcome",
        detail=f"结果：{label}{reason_str}",
    ))
    db.commit()
    db.refresh(lnk)
    return lnk


def hire_candidate(db: Session, lnk: CandidateJobLink) -> CandidateJobLink:
    lnk.outcome = "hired"
    lnk.state = "HIRED"
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
    return lnk


def transfer_job(db: Session, lnk: CandidateJobLink, new_job_id: int, keep_records: bool = False) -> CandidateJobLink:
    new_job = db.query(Job).filter(Job.id == new_job_id).first()
    if not new_job:
        raise HTTPException(status_code=404, detail="目标岗位不存在")

    lnk.outcome = "withdrawn"
    lnk.state = "WITHDRAWN"
    lnk.updated_at = datetime.utcnow()

    new_lnk = CandidateJobLink(
        candidate_id=lnk.candidate_id,
        job_id=new_job_id,
        stage=lnk.stage if keep_records else "简历筛选",
        state="IN_PROGRESS",
    )
    db.add(new_lnk)
    db.flush()

    if keep_records:
        old_records = sorted(lnk.activity_records, key=lambda r: (r.created_at or datetime.min, r.id or 0))
        for r in old_records:
            db.add(ActivityRecord(
                link_id=new_lnk.id,
                type=r.type,
                stage=r.stage,
                created_at=r.created_at,
                actor=r.actor,
                comment=r.comment,
                conclusion=r.conclusion,
                rejection_reason=r.rejection_reason,
                round=r.round,
                interview_time=r.interview_time,
                scheduled_at=r.scheduled_at,
                location=r.location,
                status=r.status,
                score=r.score,
                salary=r.salary,
                start_date=r.start_date,
                from_stage=r.from_stage,
                to_stage=r.to_stage,
                embedding_text=r.embedding_text,
                payload=r.payload,
            ))
    else:
        db.add(ActivityRecord(
            link_id=new_lnk.id,
            type="resume_review",
            stage="简历筛选",
            status="completed",
            conclusion="通过",
        ))
    db.add(HistoryEntry(
        candidate_id=lnk.candidate_id,
        job_id=new_job_id,
        event_type="stage_change",
        detail=f"转移至岗位「{new_job.title}」",
    ))
    db.commit()
    db.refresh(new_lnk)
    return new_lnk
