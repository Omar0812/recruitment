from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, exists, func, not_, select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.enums import ApplicationState, EventType
from app.models.event import Event
from app.models.legacy import Candidate, Job


def list_candidates(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    source: list[str] | None = None,
    supplier_id: int | None = None,
    tags: list[str] | None = None,
    education: str | None = None,
    years_exp_min: float | None = None,
    years_exp_max: float | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
    pipeline_status: str | None = None,
    starred: bool | None = None,
    blacklist: str | None = None,
):
    q = db.query(Candidate).filter(
        Candidate.deleted_at.is_(None),
        Candidate.merged_into.is_(None),
    )

    # Keyword search: name / phone / email
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        term = f"%{escaped}%"
        q = q.filter(
            Candidate.name.like(term, escape="\\")
            | Candidate.phone.like(term, escape="\\")
            | Candidate.email.like(term, escape="\\")
        )

    if source:
        q = q.filter(Candidate.source.in_(source))

    if supplier_id is not None:
        q = q.filter(Candidate.supplier_id == supplier_id)

    # Skill tags — AND logic (all selected tags must be present)
    if tags:
        for tag in tags:
            q = q.filter(Candidate.skill_tags.like(f'%"{tag}"%'))

    if education:
        q = q.filter(Candidate.education == education)

    if years_exp_min is not None:
        q = q.filter(Candidate.years_exp >= years_exp_min)
    if years_exp_max is not None:
        q = q.filter(Candidate.years_exp <= years_exp_max)

    if age_min is not None:
        q = q.filter(Candidate.age >= age_min)
    if age_max is not None:
        q = q.filter(Candidate.age <= age_max)

    # Pipeline status: none / in_progress / ended
    if pipeline_status == "none":
        q = q.filter(
            not_(exists().where(Application.candidate_id == Candidate.id))
        )
    elif pipeline_status == "in_progress":
        q = q.filter(
            exists().where(
                and_(
                    Application.candidate_id == Candidate.id,
                    Application.state == ApplicationState.IN_PROGRESS.value,
                )
            )
        )
    elif pipeline_status == "ended":
        # Has applications but none in progress
        q = q.filter(
            exists().where(Application.candidate_id == Candidate.id),
            not_(
                exists().where(
                    and_(
                        Application.candidate_id == Candidate.id,
                        Application.state == ApplicationState.IN_PROGRESS.value,
                    )
                )
            ),
        )

    if starred is True:
        q = q.filter(Candidate.starred == 1)

    if blacklist == "only":
        q = q.filter(Candidate.blacklisted.is_(True))
    elif blacklist == "exclude":
        q = q.filter(Candidate.blacklisted.is_(False))

    total = q.count()
    items = q.order_by(Candidate.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    # Attach latest application summary per candidate
    candidate_ids = [c.id for c in items]
    latest_apps = _get_latest_applications(db, candidate_ids) if candidate_ids else {}

    results = []
    for c in items:
        results.append({
            "candidate": c,
            "latest_application": latest_apps.get(c.id),
        })

    return {"items": results, "total": total, "page": page, "page_size": page_size}


def _get_latest_applications(db: Session, candidate_ids: list[int]) -> dict:
    """Get the latest (most recent) application per candidate, preferring IN_PROGRESS."""
    from sqlalchemy import case

    # Subquery: rank applications per candidate
    # Priority: IN_PROGRESS first, then by most recently changed status.
    apps = (
        db.query(
            Application.candidate_id,
            Application.state,
            Application.stage,
            Application.outcome,
            Application.updated_at.label("status_changed_at"),
            Job.title.label("job_title"),
            func.row_number()
            .over(
                partition_by=Application.candidate_id,
                order_by=(
                    case(
                        (Application.state == ApplicationState.IN_PROGRESS.value, 0),
                        else_=1,
                    ),
                    Application.updated_at.desc(),
                    Application.id.desc(),
                ),
            )
            .label("rn"),
        )
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id.in_(candidate_ids))
        .subquery()
    )

    rows = db.query(apps).filter(apps.c.rn == 1).all()

    result = {}
    # Collect candidate IDs for HIRED apps to fetch hire_date
    hired_candidate_ids = [r.candidate_id for r in rows if r.state == ApplicationState.HIRED.value]

    # Fetch hire_date with fallback chain: hire_confirmed.payload.hire_date → offer.onboard_date → hire_confirmed.occurred_at
    hire_dates: dict[int, str | None] = {}
    if hired_candidate_ids:
        hired_apps = (
            db.query(Application.candidate_id, Application.id)
            .filter(
                Application.candidate_id.in_(hired_candidate_ids),
                Application.state == ApplicationState.HIRED.value,
            )
            .all()
        )
        hired_app_id_map = {a.candidate_id: a.id for a in hired_apps}

        if hired_app_id_map:
            app_id_list = list(hired_app_id_map.values())

            # 取 hire_confirmed 事件
            hire_events = (
                db.query(Event)
                .filter(
                    Event.application_id.in_(app_id_list),
                    Event.type == EventType.HIRE_CONFIRMED.value,
                )
                .order_by(Event.occurred_at.desc())
                .all()
            )
            app_to_hire_event: dict[int, Event] = {}
            for ev in hire_events:
                if ev.application_id not in app_to_hire_event:
                    app_to_hire_event[ev.application_id] = ev

            # 取 offer_recorded 事件（fallback 用）
            offer_events = (
                db.query(
                    Event.application_id,
                    Event.payload["onboard_date"].as_string().label("onboard_date"),
                )
                .filter(
                    Event.application_id.in_(app_id_list),
                    Event.type == EventType.OFFER_RECORDED.value,
                )
                .order_by(Event.occurred_at.desc())
                .all()
            )
            app_to_onboard: dict[int, str] = {}
            for ev in offer_events:
                if ev.application_id not in app_to_onboard and ev.onboard_date:
                    app_to_onboard[ev.application_id] = ev.onboard_date

            for cid, app_id in hired_app_id_map.items():
                hd: str | None = None
                # 1. hire_confirmed.payload.hire_date
                hire_ev = app_to_hire_event.get(app_id)
                if hire_ev:
                    hire_payload = hire_ev.payload or {}
                    hd = hire_payload.get("hire_date")
                # 2. fallback: offer.onboard_date
                if not hd:
                    hd = app_to_onboard.get(app_id)
                # 3. fallback: hire_confirmed.occurred_at
                if not hd and hire_ev and hire_ev.occurred_at:
                    occurred = hire_ev.occurred_at
                    if isinstance(occurred, datetime):
                        hd = occurred.strftime("%Y-%m-%d")
                    else:
                        hd = str(occurred)[:10]
                hire_dates[cid] = hd

    for r in rows:
        entry: dict = {
            "job_title": r.job_title,
            "state": r.state,
            "stage": r.stage,
            "outcome": r.outcome,
            "status_changed_at": r.status_changed_at,
        }
        if r.state == ApplicationState.HIRED.value:
            entry["hire_date"] = hire_dates.get(r.candidate_id)
        result[r.candidate_id] = entry
    return result
