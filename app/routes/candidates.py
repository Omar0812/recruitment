from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os

from app.database import get_db
from app.models import Candidate, HistoryEntry, Supplier, CandidateJobLink, ActivityRecord
from app.schemas import CandidateOut
from app.services import candidates as candidates_svc

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


class CandidateCreate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    education: Optional[str] = None
    school: Optional[str] = None
    city: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    years_exp: Optional[float] = None
    skill_tags: Optional[List[str]] = []
    source: Optional[str] = None
    referred_by: Optional[str] = None
    supplier_id: Optional[int] = None
    notes: Optional[str] = None
    resume_path: Optional[str] = None
    education_list: Optional[List[dict]] = []
    work_experience: Optional[List[dict]] = []


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    education: Optional[str] = None
    school: Optional[str] = None
    city: Optional[str] = None
    last_company: Optional[str] = None
    last_title: Optional[str] = None
    years_exp: Optional[float] = None
    skill_tags: Optional[List[str]] = None
    source: Optional[str] = None
    referred_by: Optional[str] = None
    supplier_id: Optional[int] = None
    notes: Optional[str] = None
    followup_status: Optional[str] = None
    education_list: Optional[List[dict]] = None
    work_experience: Optional[List[dict]] = None
    starred: Optional[bool] = None


def _candidate_out(c: Candidate) -> dict:
    return CandidateOut.model_validate(c).model_dump()


def _sync_legacy_fields(candidate: Candidate):
    """从新数组字段同步旧字段（向后兼容）"""
    edu_list = candidate.education_list or []
    if edu_list:
        candidate.education = edu_list[0].get("degree") or candidate.education
        candidate.school = edu_list[0].get("school") or candidate.school
    work_list = candidate.work_experience or []
    if work_list:
        candidate.last_company = work_list[0].get("company") or candidate.last_company
        candidate.last_title = work_list[0].get("title") or candidate.last_title


@router.post("")
def create_candidate(data: CandidateCreate, db: Session = Depends(get_db)):
    # name 兜底：用 name_en
    payload = data.model_dump()
    if not payload.get("name") and payload.get("name_en"):
        payload["name"] = payload["name_en"]
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="姓名不能为空")
    candidate = Candidate(**payload)
    # Auto-fill source from supplier name
    if candidate.supplier_id:
        supplier = db.query(Supplier).filter(Supplier.id == candidate.supplier_id).first()
        if supplier:
            candidate.source = supplier.name
    _sync_legacy_fields(candidate)
    db.add(candidate)
    db.flush()
    db.add(HistoryEntry(candidate_id=candidate.id, event_type="created", detail="候选人档案创建"))
    db.commit()
    db.refresh(candidate)
    return _candidate_out(candidate)


class DuplicateCheckRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    last_company: Optional[str] = None


@router.post("/check-duplicate")
def check_duplicate(data: DuplicateCheckRequest, db: Session = Depends(get_db)):
    matches = []
    seen_ids = set()

    def add_matches(candidates):
        for c in candidates:
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                matches.append({"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "last_company": c.last_company})

    if data.phone:
        add_matches(db.query(Candidate).filter(Candidate.phone == data.phone, Candidate.deleted_at.is_(None)).all())
    if data.email:
        add_matches(db.query(Candidate).filter(Candidate.email == data.email, Candidate.deleted_at.is_(None)).all())
    if data.name and data.last_company:
        add_matches(db.query(Candidate).filter(Candidate.name == data.name, Candidate.last_company == data.last_company, Candidate.deleted_at.is_(None)).all())

    return {"matches": matches}


@router.get("")
def list_candidates(
    q: Optional[str] = Query(None),
    education: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    followup_status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    starred: Optional[bool] = Query(None),
    show_blacklisted: Optional[bool] = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate).filter(Candidate.deleted_at.is_(None))
    if not show_blacklisted:
        query = query.filter(Candidate.blacklisted == False)
    if q:
        query = query.filter(
            or_(
                Candidate.name.ilike(f"%{q}%"),
                Candidate.name_en.ilike(f"%{q}%"),
                Candidate.phone.ilike(f"%{q}%"),
                Candidate.email.ilike(f"%{q}%"),
            )
        )
    if education:
        query = query.filter(Candidate.education.ilike(f"%{education}%"))
    if followup_status:
        query = query.filter(Candidate.followup_status == followup_status)
    if source:
        query = query.filter(Candidate.source == source)
    if starred is True:
        query = query.filter(Candidate.starred == 1)
    candidates = query.order_by(Candidate.created_at.desc()).all()
    if tag:
        candidates = [c for c in candidates if tag in (c.skill_tags or [])]
    result = []
    for c in candidates:
        d = _candidate_out(c)
        d["active_links"] = [
            {"job_id": lnk.job_id, "job_title": lnk.job.title if lnk.job else None, "stage": lnk.stage}
            for lnk in c.job_links if not lnk.outcome
        ]
        d["job_links"] = [
            {"id": lnk.id, "job_id": lnk.job_id, "job_title": lnk.job.title if lnk.job else None, "outcome": lnk.outcome}
            for lnk in c.job_links
        ]
        result.append(d)
    return result


@router.get("/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在或已被合并")
    result = _candidate_out(c)
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
            "rejection_reason": lnk.rejection_reason,
            "created_at": lnk.created_at.isoformat() if lnk.created_at else None,
        }
        for lnk in c.job_links
    ]
    return result


@router.patch("/{candidate_id}")
def update_candidate(candidate_id: int, data: CandidateUpdate, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    # Auto-fill source from supplier name
    if c.supplier_id:
        supplier = db.query(Supplier).filter(Supplier.id == c.supplier_id).first()
        if supplier:
            c.source = supplier.name
    _sync_legacy_fields(c)
    c.updated_at = datetime.utcnow()
    db.add(HistoryEntry(candidate_id=c.id, event_type="updated", detail="信息已更新"))
    db.commit()
    db.refresh(c)
    return _candidate_out(c)


class BlacklistRequest(BaseModel):
    reason: str
    note: Optional[str] = None


@router.post("/{candidate_id}/blacklist")
def blacklist_candidate(candidate_id: int, data: BlacklistRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在")
    c = candidates_svc.blacklist_candidate(db, c, data.reason, data.note)
    return _candidate_out(c)


class UnblacklistRequest(BaseModel):
    reason: str


@router.delete("/{candidate_id}/blacklist")
def unblacklist_candidate(candidate_id: int, data: UnblacklistRequest, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在")
    c = candidates_svc.unblacklist_candidate(db, c, data.reason)
    return _candidate_out(c)


@router.get("/{candidate_id}/last-application")
def get_last_application(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="候选人不存在")
    link = (
        db.query(CandidateJobLink)
        .filter(CandidateJobLink.candidate_id == candidate_id)
        .order_by(CandidateJobLink.updated_at.desc())
        .first()
    )
    if not link:
        return {"last_application": None}
    # last interview summary
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
    days_ago = None
    if link.updated_at:
        days_ago = (datetime.utcnow() - link.updated_at).days
    return {
        "last_application": {
            "job_title": link.job.title if link.job else None,
            "final_stage": link.stage,
            "outcome": link.outcome,
            "rejection_reason": link.rejection_reason,
            "days_ago": days_ago,
            "last_interview_summary": summary,
        }
    }


@router.get("/{candidate_id}/resume-preview")
def resume_preview(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None)).first()
    if not c or not c.resume_path:
        raise HTTPException(status_code=404, detail="简历不存在")
    if not os.path.exists(c.resume_path):
        raise HTTPException(status_code=404, detail="简历文件不存在")
    ext = os.path.splitext(c.resume_path)[1].lower()
    # 构建静态访问路径
    parts = c.resume_path.replace("\\", "/").split("/")
    static_path = "/resumes/" + "/".join(parts[-2:])
    if ext == ".docx":
        try:
            from docx import Document
            doc = Document(c.resume_path)
            html_parts = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    html_parts.append(f"<p>{text}</p>")
            for table in doc.tables:
                html_parts.append("<table style='border-collapse:collapse;width:100%'>")
                for row in table.rows:
                    html_parts.append("<tr>")
                    for cell in row.cells:
                        html_parts.append(f"<td style='border:1px solid #ddd;padding:6px 8px;font-size:13px'>{cell.text}</td>")
                    html_parts.append("</tr>")
                html_parts.append("</table>")
            return {"html": "".join(html_parts)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DOCX 解析失败: {str(e)}")
    return {"redirect": static_path}
