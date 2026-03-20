from __future__ import annotations

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.application import Application
from app.models.enums import ApplicationState, EventType
from app.models.event import Event
from app.models.legacy import Candidate, Job


def list_hired(db: Session, *, page: int = 1, page_size: int = 20) -> dict:
    latest_offer_onboard_date = (
        select(Event.payload["onboard_date"].as_string())
        .where(
            Event.application_id == Application.id,
            Event.type == EventType.OFFER_RECORDED.value,
        )
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    q = db.query(Application).filter(Application.state == ApplicationState.HIRED.value)
    total = q.count()
    applications = (
        q.options(
            joinedload(Application.candidate),
            joinedload(Application.job),
        )
        .order_by(
            case((latest_offer_onboard_date.is_(None), 1), else_=0),
            latest_offer_onboard_date.desc(),
            Application.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # 批量获取 offer_event：每个 application 取最新一条 OFFER_RECORDED
    app_ids = [app.id for app in applications]
    offer_event_map: dict[int, Event] = {}
    if app_ids:
        # 子查询：每个 application_id 的最新 OFFER_RECORDED event id
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

    items = []
    for app in applications:
        candidate = app.candidate
        job = app.job
        offer_event = offer_event_map.get(app.id)

        offer_payload = (offer_event.payload or {}) if offer_event else {}

        monthly_salary = offer_payload.get("cash_monthly", offer_payload.get("monthly_salary"))
        salary_months = offer_payload.get("months") or offer_payload.get("salary_months")
        total_cash = offer_payload.get("total_cash")
        if monthly_salary is not None and salary_months is not None and total_cash is None:
            total_cash = monthly_salary * salary_months

        onboard_date = offer_payload.get("onboard_date")

        items.append({
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.name if candidate else None,
            "job_id": app.job_id,
            "job_title": job.title if job else None,
            "onboard_date": onboard_date,
            "monthly_salary": monthly_salary,
            "salary_months": salary_months,
            "total_cash": total_cash,
            "source": candidate.source if candidate else None,
            "supplier_id": candidate.supplier_id if candidate else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}
