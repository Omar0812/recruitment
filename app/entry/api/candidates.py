"""Candidate resources: list/detail/write + duplicate check."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.audit import log_audit
from app.engine.version import check_version, bump_version
from app.entry.deps import current_user
from app.models.application import Application
from app.models.action_receipt import ActionReceipt
from app.models.enums import ApplicationState
from app.models.legacy import Candidate, Job
from app.models.user import User
from app.query.candidates import list_candidates as query_list_candidates
from app.schemas.candidate import (
    CandidateCreate,
    CandidateDuplicateActiveLink,
    CandidateDuplicateCheckRequest,
    CandidateDuplicateCheckResponse,
    CandidateDuplicateLastApplication,
    CandidateDuplicateMatch,
    CandidateRead,
    CandidateWithApplication,
    LatestApplication,
)
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/candidates", tags=["candidates"])


def _get_candidate_or_404(db: Session, candidate_id: int) -> Candidate:
    candidate = db.get(Candidate, candidate_id)
    if candidate is None or candidate.deleted_at is not None:
        raise HTTPException(404, "Candidate not found")
    return candidate


def _record_candidate_write(
    db: Session,
    *,
    action_code: str,
    candidate_id: int,
    actor_id: int,
    details: dict,
) -> None:
    log_audit(
        db,
        actor_type="human",
        action_code=action_code,
        target_type="candidate",
        target_id=candidate_id,
        actor_id=actor_id,
        details=details,
    )
    db.add(ActionReceipt(
        command_id=str(uuid4()),
        action_code=action_code,
        target_type="candidate",
        target_id=candidate_id,
        actor_id=actor_id,
        ok=True,
    ))


def _build_match_reasons(
    candidate: Candidate,
    *,
    name: Optional[str],
    phone: Optional[str],
    email: Optional[str],
) -> list[str]:
    reasons: list[str] = []
    if name and candidate.name == name:
        reasons.append("name")
    if phone and candidate.phone == phone:
        reasons.append("phone")
    if email and candidate.email == email:
        reasons.append("email")
    return reasons


def _get_latest_application(candidate_id: int, db: Session):
    return (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.updated_at.desc(), Application.id.desc())
        .first()
    )


def _get_active_application(candidate_id: int, db: Session):
    return (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(
            Application.candidate_id == candidate_id,
            Application.state == ApplicationState.IN_PROGRESS.value,
        )
        .order_by(Application.updated_at.desc(), Application.id.desc())
        .first()
    )


@router.get("", response_model=PaginatedResponse[CandidateWithApplication])
def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    source: Optional[list[str]] = Query(None),
    supplier_id: Optional[int] = None,
    tags: Optional[str] = Query(None, description="技能标签，逗号分隔，AND 匹配"),
    education: Optional[str] = None,
    years_exp_min: Optional[float] = None,
    years_exp_max: Optional[float] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    pipeline_status: Optional[str] = Query(None, description="none / in_progress / ended"),
    starred: Optional[bool] = None,
    blacklist: Optional[str] = Query(None, description="only / exclude (default: all)"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None

    result = query_list_candidates(
        db,
        page=page,
        page_size=page_size,
        search=search,
        source=source,
        supplier_id=supplier_id,
        tags=tag_list,
        education=education,
        years_exp_min=years_exp_min,
        years_exp_max=years_exp_max,
        age_min=age_min,
        age_max=age_max,
        pipeline_status=pipeline_status,
        starred=starred,
        blacklist=blacklist,
    )

    items = []
    for row in result["items"]:
        c = row["candidate"]
        la = row["latest_application"]
        item = CandidateWithApplication.model_validate(c)
        if la:
            item.latest_application = LatestApplication(**la)
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get("/{candidate_id}", response_model=CandidateRead)
async def get_candidate(candidate_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    candidate = _get_candidate_or_404(db, candidate_id)
    data = CandidateRead.model_validate(candidate)
    if candidate.created_by is not None:
        creator = db.get(User, candidate.created_by)
        if creator is not None:
            data.created_by_name = creator.display_name
    return data


@router.post("", response_model=CandidateRead, status_code=201)
async def create_candidate(body: CandidateCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    payload = body.model_dump(exclude_none=True)
    candidate = Candidate(**payload)
    candidate.created_by = user.id
    # resume_path → attachments 同步
    if candidate.resume_path and not candidate.attachments:
        candidate.attachments = [{
            "file_path": candidate.resume_path,
            "label": "简历",
            "type": "resume",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }]
    db.add(candidate)
    db.flush()
    _record_candidate_write(
        db,
        action_code="create_candidate",
        candidate_id=candidate.id,
        actor_id=user.id,
        details=payload,
    )
    db.commit()
    db.refresh(candidate)
    return candidate


@router.put("/{candidate_id}", response_model=CandidateRead)
async def update_candidate(candidate_id: int, body: CandidateCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    candidate = _get_candidate_or_404(db, candidate_id)
    check_version(candidate, body.version)
    payload = body.model_dump(exclude_unset=True, exclude={"version"})
    for key, value in payload.items():
        setattr(candidate, key, value)
    bump_version(candidate)
    # resume_path → attachments 同步
    if "resume_path" in payload and payload["resume_path"]:
        from app.entry.api.actions import _sync_resume_path_to_attachments
        _sync_resume_path_to_attachments(candidate, payload["resume_path"])
    db.flush()
    _record_candidate_write(
        db,
        action_code="update_candidate",
        candidate_id=candidate.id,
        actor_id=user.id,
        details=payload,
    )
    db.commit()
    db.refresh(candidate)
    return candidate


@router.patch("/{candidate_id}/star")
async def toggle_star(candidate_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _get_candidate_or_404(db, candidate_id)
    c.starred = 0 if c.starred else 1
    log_audit(
        db,
        actor_type="human",
        action_code="toggle_star",
        target_type="candidate",
        target_id=candidate_id,
        actor_id=user.id,
        details={"starred": bool(c.starred)},
    )
    db.commit()
    db.refresh(c)
    return {"starred": bool(c.starred)}


@router.post("/check-duplicate", response_model=CandidateDuplicateCheckResponse)
async def check_duplicate(
    body: Optional[CandidateDuplicateCheckRequest] = Body(None),
    name: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    name = body.name if body and body.name is not None else name
    phone = body.phone if body and body.phone is not None else phone
    email = body.email if body and body.email is not None else email

    matches = []
    if phone:
        matches.extend(
            db.query(Candidate)
            .filter(Candidate.phone == phone, Candidate.deleted_at.is_(None))
            .all()
        )
    if email:
        matches.extend(
            db.query(Candidate)
            .filter(Candidate.email == email, Candidate.deleted_at.is_(None))
            .all()
        )
    if name and not matches:
        matches.extend(
            db.query(Candidate)
            .filter(Candidate.name == name, Candidate.deleted_at.is_(None))
            .all()
        )
    seen = set()
    unique = []
    for m in matches:
        if m.id not in seen:
            seen.add(m.id)
            unique.append(m)

    duplicate_items = [CandidateRead.model_validate(m) for m in unique]
    if not unique:
        return CandidateDuplicateCheckResponse()

    response_matches: list[CandidateDuplicateMatch] = []
    has_blocking_in_progress_match = False
    for candidate in unique:
        reasons = _build_match_reasons(candidate, name=name, phone=phone, email=email)
        latest_application = _get_latest_application(candidate.id, db)
        active_application = _get_active_application(candidate.id, db)

        latest_summary = None
        if latest_application is not None:
            application, job = latest_application
            latest_summary = CandidateDuplicateLastApplication(
                job_title=job.title,
                outcome=application.outcome,
                stage=application.stage,
                ended_at=application.updated_at if application.state != ApplicationState.IN_PROGRESS.value else None,
            )

        active_link = None
        if active_application is not None:
            application, job = active_application
            active_link = CandidateDuplicateActiveLink(
                application_id=application.id,
                job_id=job.id,
                job_title=job.title,
                stage=application.stage or "未知阶段",
            )
            has_blocking_in_progress_match = True

        response_matches.append(CandidateDuplicateMatch(
            candidate_id=candidate.id,
            display_id=f"C-{candidate.id:04d}",
            name=candidate.name,
            phone=candidate.phone,
            email=candidate.email,
            last_company=candidate.last_company,
            last_title=candidate.last_title,
            match_reasons=reasons,
            match_level="low" if reasons == ["name"] else "high",
            is_blacklisted=bool(candidate.blacklisted),
            blacklist_reason=candidate.blacklist_reason,
            last_application=latest_summary,
            active_link=active_link,
        ))

    return CandidateDuplicateCheckResponse(
        matches=response_matches,
        requires_decision=True,
        has_blocking_in_progress_match=has_blocking_in_progress_match,
        duplicates=duplicate_items,
    )


class AttachmentPayload(BaseModel):
    file_path: str
    label: Optional[str] = None
    type: Optional[str] = None


@router.post("/{candidate_id}/attachments")
async def add_attachment(
    candidate_id: int,
    body: AttachmentPayload,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate_or_404(db, candidate_id)
    attachments = list(candidate.attachments or [])
    attachments.append({
        "file_path": body.file_path,
        "label": body.label or "附件",
        "type": body.type or "attachment",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    candidate.attachments = attachments
    log_audit(
        db,
        actor_type="human",
        action_code="add_attachment",
        target_type="candidate",
        target_id=candidate_id,
        actor_id=user.id,
        details={"file_path": body.file_path},
    )
    db.commit()
    db.refresh(candidate)
    return {"attachments": candidate.attachments}


class AttachmentDeletePayload(BaseModel):
    file_path: str


@router.delete("/{candidate_id}/attachments")
async def remove_attachment(
    candidate_id: int,
    body: AttachmentDeletePayload,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate_or_404(db, candidate_id)
    attachments = list(candidate.attachments or [])
    attachments = [a for a in attachments if a.get("file_path") != body.file_path]
    candidate.attachments = attachments
    log_audit(
        db,
        actor_type="human",
        action_code="remove_attachment",
        target_type="candidate",
        target_id=candidate_id,
        actor_id=user.id,
        details={"file_path": body.file_path},
    )
    db.commit()
    db.refresh(candidate)
    return {"attachments": candidate.attachments}
