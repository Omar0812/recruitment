"""GET /analytics/overview + /analytics/jobs + /analytics/channels"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.entry.deps import current_user
from app.models.user import User
from app.query.analytics import (
    get_channel_drilldown,
    get_channels_list,
    get_job_drilldown,
    get_jobs_list,
    get_overview,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _parse_date(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid date: {s}")


@router.get("/overview")
def analytics_overview(
    start: str = Query(...),
    end: str = Query(...),
    granularity: str = Query("week"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return get_overview(db, _parse_date(start), _parse_date(end), granularity)


@router.get("/jobs")
def analytics_jobs(
    start: str = Query(...),
    end: str = Query(...),
    filter: str = Query("open"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return get_jobs_list(db, _parse_date(start), _parse_date(end), filter)


@router.get("/jobs/{job_id}")
def analytics_job_drilldown(
    job_id: int,
    start: str = Query(...),
    end: str = Query(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    result = get_job_drilldown(db, job_id, _parse_date(start), _parse_date(end))
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/channels")
def analytics_channels(
    start: str = Query(...),
    end: str = Query(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return get_channels_list(db, _parse_date(start), _parse_date(end))


@router.get("/channels/{channel_key:path}")
def analytics_channel_drilldown(
    channel_key: str,
    start: str = Query(...),
    end: str = Query(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return get_channel_drilldown(db, channel_key, _parse_date(start), _parse_date(end))
