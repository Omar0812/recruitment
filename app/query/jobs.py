from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.enums import ApplicationState, TermType
from app.models.legacy import Job
from app.models.term import Term
from app.schemas.job import JobRead


def list_jobs(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
) -> dict[str, object]:
    query = db.query(Job)
    if status:
        query = query.filter(Job.status == status)

    normalized_keyword = (keyword or "").strip().lower()
    if normalized_keyword:
        escaped = normalized_keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.filter(func.lower(Job.title).like(f"%{escaped}%", escape="\\"))

    total = query.count()
    jobs = (
        query.order_by(Job.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    location_address_map = _get_location_address_map(
        db,
        [job.location_name or job.city for job in jobs],
    )
    job_ids = [job.id for job in jobs]
    hired_map = _get_hired_count_map(db, job_ids)
    stage_dist_map = _get_stage_distribution_map(db, job_ids)
    items = [
        serialize_job(
            job,
            location_address_map=location_address_map,
            hired_count=hired_map.get(job.id, 0),
            stage_distribution=stage_dist_map.get(job.id, {}),
        )
        for job in jobs
    ]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_job(db: Session, job_id: int) -> Job | None:
    return db.get(Job, job_id)


def serialize_job(
    job: Job,
    *,
    location_address_map: Optional[dict[str, str]] = None,
    hired_count: int = 0,
    stage_distribution: Optional[dict[str, int]] = None,
) -> JobRead:
    location_name = job.location_name or job.city
    notes = job.notes or job.persona
    location_address = job.location_address
    if not location_address and location_name and location_address_map:
        location_address = location_address_map.get(location_name)
    return JobRead(
        id=job.id,
        title=job.title,
        department=job.department,
        location_name=location_name,
        location_address=location_address,
        headcount=job.headcount,
        jd=job.jd,
        priority=job.priority,
        target_onboard_date=job.target_onboard_date,
        notes=notes,
        status=job.status,
        close_reason=job.close_reason,
        closed_at=job.closed_at,
        hired_count=hired_count,
        stage_distribution=stage_distribution or {},
        created_at=job.created_at,
        updated_at=job.updated_at,
        version=job.version,
    )


def get_location_address_map(db: Session, names: list[Optional[str]]) -> dict[str, str]:
    return _get_location_address_map(db, names)


def _get_location_address_map(db: Session, names: list[Optional[str]]) -> dict[str, str]:
    location_names = sorted({name for name in names if name})
    if not location_names:
        return {}

    rows = (
        db.query(Term.name, Term.address)
        .filter(
            Term.type == TermType.LOCATION.value,
            Term.name.in_(location_names),
            Term.address.is_not(None),
        )
        .all()
    )
    return {
        name: address
        for name, address in rows
        if name and address
    }


def _get_hired_count_map(db: Session, job_ids: list[int]) -> dict[int, int]:
    """批量查询各岗位已到岗人数。"""
    if not job_ids:
        return {}
    rows = (
        db.query(Application.job_id, func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids),
            Application.state == ApplicationState.HIRED.value,
        )
        .group_by(Application.job_id)
        .all()
    )
    return {job_id: count for job_id, count in rows}


def _get_stage_distribution_map(
    db: Session, job_ids: list[int],
) -> dict[int, dict[str, int]]:
    """批量查询各岗位活跃候选人阶段分布。"""
    if not job_ids:
        return {}
    rows = (
        db.query(
            Application.job_id,
            Application.stage,
            func.count(Application.id),
        )
        .filter(
            Application.job_id.in_(job_ids),
            Application.state == ApplicationState.IN_PROGRESS.value,
        )
        .group_by(Application.job_id, Application.stage)
        .all()
    )
    result: dict[int, dict[str, int]] = {}
    for job_id, stage, count in rows:
        if job_id not in result:
            result[job_id] = {}
        if stage:
            result[job_id][stage] = count
    return result


def get_job_hired_count(db: Session, job_id: int) -> int:
    """单岗位已到岗人数。"""
    return _get_hired_count_map(db, [job_id]).get(job_id, 0)


def get_job_stage_distribution(db: Session, job_id: int) -> dict[str, int]:
    """单岗位阶段分布。"""
    return _get_stage_distribution_map(db, [job_id]).get(job_id, {})
