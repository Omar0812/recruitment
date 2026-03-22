from __future__ import annotations

from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.application import Application
from app.models.enums import ApplicationState, EventType
from app.models.event import Event
from app.models.legacy import Candidate, Job


def list_hired(db: Session, *, page: int = 1, page_size: int = 20) -> dict:
    # hire_date 排序子查询：COALESCE(hire_confirmed.payload.hire_date, offer.onboard_date)
    hire_date_from_payload = (
        select(Event.payload["hire_date"].as_string())
        .where(
            Event.application_id == Application.id,
            Event.type == EventType.HIRE_CONFIRMED.value,
        )
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    offer_onboard_date = (
        select(Event.payload["onboard_date"].as_string())
        .where(
            Event.application_id == Application.id,
            Event.type == EventType.OFFER_RECORDED.value,
        )
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    effective_hire_date = func.coalesce(hire_date_from_payload, offer_onboard_date)

    q = db.query(Application).filter(Application.state == ApplicationState.HIRED.value)
    total = q.count()
    applications = (
        q.options(
            joinedload(Application.candidate),
            joinedload(Application.job),
        )
        .order_by(
            case((effective_hire_date.is_(None), 1), else_=0),
            effective_hire_date.desc(),
            Application.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    app_ids = [app.id for app in applications]

    # 批量获取 offer_event：每个 application 取最新一条 OFFER_RECORDED
    offer_event_map: dict[int, Event] = {}
    # 批量获取 hire_confirmed_event：每个 application 取最新一条 HIRE_CONFIRMED
    hire_event_map: dict[int, Event] = {}

    if app_ids:
        latest_offer_id_subq = (
            select(
                Event.application_id,
                func.max(Event.id).label("max_id"),
            )
            .where(
                Event.application_id.in_(app_ids),
                Event.type == EventType.OFFER_RECORDED.value,
            )
            .group_by(Event.application_id)
            .subquery()
        )
        offer_events = (
            db.query(Event)
            .join(
                latest_offer_id_subq,
                Event.id == latest_offer_id_subq.c.max_id,
            )
            .all()
        )
        for ev in offer_events:
            offer_event_map[ev.application_id] = ev

        latest_hire_id_subq = (
            select(
                Event.application_id,
                func.max(Event.id).label("max_id"),
            )
            .where(
                Event.application_id.in_(app_ids),
                Event.type == EventType.HIRE_CONFIRMED.value,
            )
            .group_by(Event.application_id)
            .subquery()
        )
        hire_events = (
            db.query(Event)
            .join(
                latest_hire_id_subq,
                Event.id == latest_hire_id_subq.c.max_id,
            )
            .all()
        )
        for ev in hire_events:
            hire_event_map[ev.application_id] = ev

    items = []
    for app in applications:
        candidate = app.candidate
        job = app.job
        offer_event = offer_event_map.get(app.id)
        hire_event = hire_event_map.get(app.id)

        offer_payload = (offer_event.payload or {}) if offer_event else {}

        monthly_salary = offer_payload.get("monthly_salary")
        salary_months = offer_payload.get("salary_months")
        total_cash = offer_payload.get("total_cash")
        if monthly_salary is not None and salary_months is not None and total_cash is None:
            total_cash = monthly_salary * salary_months

        # hire_date fallback 链：payload.hire_date → offer.onboard_date → hire_confirmed.occurred_at
        hire_date = None
        if hire_event:
            hire_payload = hire_event.payload or {}
            hire_date = hire_payload.get("hire_date")
        if not hire_date:
            hire_date = offer_payload.get("onboard_date")
        if not hire_date and hire_event and hire_event.occurred_at:
            occurred = hire_event.occurred_at
            if isinstance(occurred, datetime):
                hire_date = occurred.strftime("%Y-%m-%d")
            else:
                hire_date = str(occurred)[:10]

        items.append({
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.name if candidate else None,
            "job_id": app.job_id,
            "job_title": job.title if job else None,
            "hire_date": hire_date,
            "monthly_salary": monthly_salary,
            "salary_months": salary_months,
            "total_cash": total_cash,
            "source": candidate.source if candidate else None,
            "supplier_id": candidate.supplier_id if candidate else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}
