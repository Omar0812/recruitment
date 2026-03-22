"""GET /applications + GET /applications/{id} + GET /pipeline/active + GET /hired"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.entry.deps import current_user
from app.models.application import Application
from app.models.enums import ApplicationState
from app.models.user import User
from app.query.pipeline import get_event_summaries
from app.schemas.application import ApplicationRead, EventSummaryItem
from app.schemas.pagination import PaginatedResponse

router = APIRouter(tags=["applications"])


def _serialize_application(application: Application) -> ApplicationRead:
    return ApplicationRead(
        id=application.id,
        candidate_id=application.candidate_id,
        candidate_name=application.candidate.name if application.candidate else None,
        job_id=application.job_id,
        job_title=application.job.title if application.job else None,
        state=application.state,
        outcome=application.outcome,
        stage=application.stage,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


@router.get("/applications", response_model=PaginatedResponse[ApplicationRead])
def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    state: Optional[str] = None,
    candidate_id: Optional[int] = None,
    job_id: Optional[int] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Application).options(joinedload(Application.candidate), joinedload(Application.job))
    if state:
        q = q.filter(Application.state == state)
    if candidate_id:
        q = q.filter(Application.candidate_id == candidate_id)
    if job_id:
        q = q.filter(Application.job_id == job_id)
    total = q.count()
    items = q.order_by(Application.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_serialize_application(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/applications/{application_id}", response_model=ApplicationRead)
def get_application(application_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = (
        db.query(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .filter(Application.id == application_id)
        .one_or_none()
    )
    if a is None:
        raise HTTPException(404, "Application not found")
    return _serialize_application(a)


@router.get("/pipeline/active", response_model=PaginatedResponse[ApplicationRead])
def pipeline_active(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .filter(Application.state == ApplicationState.IN_PROGRESS.value)
    )
    total = q.count()
    items = q.order_by(Application.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_serialize_application(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/pipeline/event-summaries")
def pipeline_event_summaries(
    application_ids: str = Query(""),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not application_ids.strip():
        return {}
    ids = [int(x) for x in application_ids.split(",") if x.strip().isdigit()]
    if not ids:
        return {}
    summaries = get_event_summaries(db, ids)
    return {str(k): EventSummaryItem(**v) for k, v in summaries.items()}


@router.get("/hired")
def hired_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    from app.query.hired import list_hired
    return list_hired(db, page=page, page_size=page_size)
