"""GET /jobs + GET /jobs/{id} + POST /jobs + PUT /jobs/{id} + POST /jobs/{id}/close"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.audit import log_audit
from app.engine.errors import BusinessError
from app.engine.version import check_version, bump_version
from app.entry.deps import current_user
from app.models.legacy import Job
from app.models.action_receipt import ActionReceipt
from app.models.application import Application
from app.models.enums import ActorType, ApplicationState, EventType, Outcome
from app.models.event import Event
from app.models.user import User
from app.query.jobs import (
    get_job as query_get_job,
    get_job_hired_count,
    get_job_stage_distribution,
    get_location_address_map,
    list_jobs as query_list_jobs,
    serialize_job,
)
from app.schemas.job import JobCloseRequest, JobCreate, JobRead, JobUpdate
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=PaginatedResponse[JobRead])
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    result = query_list_jobs(
        db,
        page=page,
        page_size=page_size,
        status=status,
        keyword=keyword,
    )
    return PaginatedResponse[JobRead](**result)


@router.get("/{job_id}", response_model=JobRead)
async def get_job(job_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    location_address_map = get_location_address_map(db, [job.location_name or job.city])
    return serialize_job(
        job,
        location_address_map=location_address_map,
        hired_count=get_job_hired_count(db, job.id),
        stage_distribution=get_job_stage_distribution(db, job.id),
    )


@router.post("", response_model=JobRead, status_code=201)
async def create_job(body: JobCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    payload = body.model_dump(exclude_none=True)
    location_address = body.location_address.strip() if body.location_address else None
    if location_address is None:
        payload.pop("location_address", None)
    job = Job(
        title=body.title.strip(),
        department=body.department.strip(),
        city=body.location_name.strip(),
        location_name=body.location_name.strip(),
        location_address=location_address,
        headcount=body.headcount,
        jd=body.jd.strip(),
        priority=body.priority,
        target_onboard_date=body.target_onboard_date,
        notes=body.notes.strip() if body.notes else None,
        status="open",
    )
    db.add(job)
    db.flush()
    _record_job_write(
        db,
        action_code="create_job",
        job_id=job.id,
        actor_id=user.id,
        details=payload,
    )
    db.commit()
    db.refresh(job)
    location_address_map = get_location_address_map(db, [job.location_name or job.city])
    return serialize_job(job, location_address_map=location_address_map)


@router.put("/{job_id}", response_model=JobRead)
async def update_job(job_id: int, body: JobUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    if job.status != "open":
        raise BusinessError("job_not_editable", "已关闭的岗位不可编辑")
    check_version(job, body.version)

    update_data = body.model_dump(exclude_unset=True, exclude={"version"})
    for key, value in update_data.items():
        if isinstance(value, str):
            update_data[key] = value.strip()
    if "location_name" in update_data:
        update_data["city"] = update_data["location_name"]

    for key, value in update_data.items():
        setattr(job, key, value)
    bump_version(job)

    db.flush()
    _record_job_write(
        db,
        action_code="update_job",
        job_id=job.id,
        actor_id=user.id,
        details=update_data,
    )
    db.commit()
    db.refresh(job)
    location_address_map = get_location_address_map(db, [job.location_name or job.city])
    return serialize_job(
        job,
        location_address_map=location_address_map,
        hired_count=get_job_hired_count(db, job.id),
        stage_distribution=get_job_stage_distribution(db, job.id),
    )


@router.post("/{job_id}/close", response_model=JobRead)
async def close_job(job_id: int, body: JobCloseRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    reason = body.reason.strip()
    if not reason:
        raise BusinessError("close_reason_required", "请选择关闭原因")
    if job.status == "closed":
        raise BusinessError("job_already_closed", "岗位已关闭")
    check_version(job, body.version)

    active_applications = (
        db.query(Application)
        .filter(
            Application.job_id == job.id,
            Application.state == ApplicationState.IN_PROGRESS.value,
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    job.status = "closed"
    job.close_reason = reason
    job.closed_at = now

    for application in active_applications:
        application.state = ApplicationState.REJECTED.value
        application.outcome = Outcome.REJECTED.value
        db.add(Event(
            application_id=application.id,
            type=EventType.APPLICATION_ENDED.value,
            occurred_at=now,
            actor_type=ActorType.HUMAN.value,
            actor_id=user.id,
            payload={"outcome": "rejected", "reason": "岗位关闭"},
            body=f"岗位关闭：{reason}",
        ))

    db.flush()
    bump_version(job)
    _record_job_write(
        db,
        action_code="close_job",
        job_id=job.id,
        actor_id=user.id,
        details={
            "reason": reason,
            "closed_application_ids": [application.id for application in active_applications],
        },
    )
    db.commit()
    db.refresh(job)
    location_address_map = get_location_address_map(db, [job.location_name or job.city])
    return serialize_job(job, location_address_map=location_address_map)


def _get_job_or_404(db: Session, job_id: int) -> Job:
    job = query_get_job(db, job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return job


def _record_job_write(
    db: Session,
    *,
    action_code: str,
    job_id: int,
    actor_id: int,
    details: dict,
) -> None:
    log_audit(
        db,
        actor_type="human",
        action_code=action_code,
        target_type="job",
        target_id=job_id,
        actor_id=actor_id,
        details=jsonable_encoder(details),
    )
    db.add(ActionReceipt(
        command_id=str(uuid4()),
        action_code=action_code,
        target_type="job",
        target_id=job_id,
        actor_id=actor_id,
        ok=True,
    ))
