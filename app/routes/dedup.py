from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Candidate, CandidateJobLink, InterviewRecord, HistoryEntry

router = APIRouter(prefix="/api/candidates/dedup", tags=["dedup"])


def _candidate_brief(c: Candidate) -> dict:
    return {
        "id": c.id,
        "display_id": f"C{c.id:03d}",
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "last_company": c.last_company,
        "last_title": c.last_title,
    }


@router.get("/scan")
def scan_duplicates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).filter(Candidate.deleted_at.is_(None)).all()

    pairs = []
    seen = set()

    # 按手机号分组
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
                    pairs.append({"reason": "手机号相同", "a": _candidate_brief(group[i]), "b": _candidate_brief(group[j])})

    # 按邮箱分组
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
                    pairs.append({"reason": "邮箱相同", "a": _candidate_brief(group[i]), "b": _candidate_brief(group[j])})

    # 姓名相同且无手机/邮箱
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
                    pairs.append({"reason": "姓名相同且无联系方式", "a": _candidate_brief(group[i]), "b": _candidate_brief(group[j])})

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
            # 相同岗位：迁移面试记录到主档案对应 link，然后删除副档案记录
            pri_link = primary_job_ids[sec_link.job_id]
            for ir in list(sec_link.interview_records):
                ir.link_id = pri_link.id
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
