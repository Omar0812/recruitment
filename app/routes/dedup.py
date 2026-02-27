from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import Candidate, CandidateJobLink, HistoryEntry, ActivityRecord

router = APIRouter(prefix="/api/candidates/dedup", tags=["dedup"])


def _last_application_context(c: Candidate, db: Session) -> Optional[dict]:
    link = (
        db.query(CandidateJobLink)
        .filter(CandidateJobLink.candidate_id == c.id)
        .order_by(CandidateJobLink.updated_at.desc())
        .first()
    )
    if not link:
        return None
    last_interview = (
        db.query(ActivityRecord)
        .filter(ActivityRecord.link_id == link.id, ActivityRecord.type == "interview")
        .order_by(ActivityRecord.id.desc())
        .first()
    )
    summary = None
    if last_interview:
        p = last_interview.payload or {}
        comment = p.get("comment") or last_interview.comment or ""
        conclusion = p.get("conclusion") or last_interview.conclusion or ""
        summary = f"{conclusion}：{comment[:50]}" if comment else conclusion
    days_ago = (datetime.utcnow() - link.updated_at).days if link.updated_at else None
    return {
        "job_title": link.job.title if link.job else None,
        "final_stage": link.stage,
        "outcome": link.outcome,
        "rejection_reason": link.rejection_reason,
        "days_ago": days_ago,
        "last_interview_summary": summary,
    }


def _candidate_brief(c: Candidate, db: Session) -> dict:
    return {
        "id": c.id,
        "display_id": f"C{c.id:03d}",
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "last_company": c.last_company,
        "last_title": c.last_title,
        "is_blacklisted": bool(c.blacklisted),
        "blacklist_reason": c.blacklist_reason,
        "last_application": _last_application_context(c, db),
    }


@router.get("/scan")
def scan_duplicates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).filter(Candidate.deleted_at.is_(None)).all()

    pairs = []
    seen = set()

    # 按手机号分组（精确匹配）
    phone_map = {}
    for c in candidates:
        if c.phone:
            phone_map.setdefault(c.phone, []).append(c)

    for phone, group in phone_map.items():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                key = (min(group[i].id, group[j].id), max(group[i].id, group[j].id))
                if key not in seen:
                    seen.add(key)
                    pairs.append({"reason": "手机号相同", "match_type": "exact", "a": _candidate_brief(group[i], db), "b": _candidate_brief(group[j], db)})

    # 按邮箱分组（精确匹配）
    email_map = {}
    for c in candidates:
        if c.email:
            email_map.setdefault(c.email.lower(), []).append(c)

    for email, group in email_map.items():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                key = (min(group[i].id, group[j].id), max(group[i].id, group[j].id))
                if key not in seen:
                    seen.add(key)
                    pairs.append({"reason": "邮箱相同", "match_type": "exact", "a": _candidate_brief(group[i], db), "b": _candidate_brief(group[j], db)})

    # 姓名相同且无手机/邮箱（模糊匹配）
    name_map = {}
    for c in candidates:
        if c.name and not c.phone and not c.email:
            name_map.setdefault(c.name, []).append(c)

    for name, group in name_map.items():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                key = (min(group[i].id, group[j].id), max(group[i].id, group[j].id))
                if key not in seen:
                    seen.add(key)
                    pairs.append({"reason": "姓名相同且无联系方式", "match_type": "fuzzy", "a": _candidate_brief(group[i], db), "b": _candidate_brief(group[j], db)})

    return {"pairs": pairs}


class MergeRequest(BaseModel):
    primary_id: int
    secondary_id: int


@router.post("/merge")
def merge_candidates(data: MergeRequest, db: Session = Depends(get_db)):
    primary = db.query(Candidate).filter(Candidate.id == data.primary_id, Candidate.deleted_at.is_(None)).first()
    secondary = db.query(Candidate).filter(Candidate.id == data.secondary_id, Candidate.deleted_at.is_(None)).first()

    if not primary:
        raise HTTPException(status_code=404, detail="主档案不存在")
    if not secondary:
        raise HTTPException(status_code=404, detail="副档案不存在")

    # 主档案已有的岗位 id 集合
    primary_job_ids = {lnk.job_id: lnk for lnk in primary.job_links}

    for sec_link in list(secondary.job_links):
        if sec_link.job_id not in primary_job_ids:
            # 不同岗位：直接迁移
            sec_link.candidate_id = data.primary_id
        else:
            # 相同岗位：迁移活动记录到主档案对应 link，然后删除副档案记录
            pri_link = primary_job_ids[sec_link.job_id]
            for ar in list(sec_link.activity_records):
                ar.link_id = pri_link.id
            db.delete(sec_link)

    # 迁移历史记录
    for entry in list(secondary.history):
        entry.candidate_id = data.primary_id

    # 新增合并历史
    db.add(HistoryEntry(
        candidate_id=data.primary_id,
        event_type="note",
        detail=f"合并自 C{data.secondary_id:03d}",
    ))

    # 软删除副档案
    secondary.merged_into = data.primary_id
    secondary.deleted_at = datetime.utcnow()

    db.commit()
    return {"ok": True, "primary_id": data.primary_id, "secondary_id": data.secondary_id}
