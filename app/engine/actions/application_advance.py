from __future__ import annotations

from datetime import date as dt_date, datetime

from sqlalchemy.orm import Session

from app.engine import guards
from app.engine.registry import register
from app.models.application import Application
from app.models.enums import ApplicationState, EventType, Outcome
from app.models.event import Event
from app.utils.time import BIZ_TZ, utc_now


def _make_advance_handler(event_type: EventType):
    def handler(
        db: Session,
        application: Application,
        payload: dict,
        actor_type: str,
        actor_id: int | None = None,
    ) -> Event:
        event = Event(
            application_id=application.id,
            type=event_type.value,
            occurred_at=utc_now(),
            actor_type=actor_type,
            actor_id=actor_id,
            payload=payload or None,
            body=(payload or {}).get("body"),
        )
        db.add(event)
        return event

    handler.__name__ = f"handle_{event_type.value}"
    return handler


def handle_hire_confirmed(
    db: Session,
    application: Application,
    payload: dict,
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    application.state = ApplicationState.HIRED.value
    application.outcome = Outcome.HIRED.value

    # 计算 hire_date = min(offer.onboard_date, 今天北京时间)
    today_biz = utc_now().astimezone(BIZ_TZ).date()

    latest_offer = (
        db.query(Event)
        .filter(
            Event.application_id == application.id,
            Event.type == EventType.OFFER_RECORDED.value,
        )
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .first()
    )

    onboard_date: dt_date | None = None
    if latest_offer and latest_offer.payload:
        od_str = latest_offer.payload.get("onboard_date")
        if od_str:
            try:
                onboard_date = dt_date.fromisoformat(str(od_str)[:10])
            except (ValueError, TypeError):
                pass

    hire_date = min(onboard_date, today_biz) if onboard_date else today_biz

    # 将 hire_date 写入 payload
    merged_payload = dict(payload) if payload else {}
    merged_payload["hire_date"] = hire_date.isoformat()

    event = Event(
        application_id=application.id,
        type=EventType.HIRE_CONFIRMED.value,
        occurred_at=utc_now(),
        actor_type=actor_type,
        actor_id=actor_id,
        payload=merged_payload,
        body=(payload or {}).get("body"),
    )
    db.add(event)
    return event


register(
    "pass_screening",
    guard=guards.guard_screening_passed,
    handler=_make_advance_handler(EventType.SCREENING_PASSED),
)
register(
    "advance_to_offer",
    guard=guards.guard_advance_to_offer,
    handler=_make_advance_handler(EventType.ADVANCE_TO_OFFER),
)
register(
    "start_background_check",
    guard=guards.guard_start_background_check,
    handler=_make_advance_handler(EventType.START_BACKGROUND_CHECK),
)
def handle_offer_recorded(
    db: Session,
    application: Application,
    payload: dict,
    actor_type: str,
    actor_id: int | None = None,
) -> Event:
    # 标准化字段名（旧: cash_monthly/months → 新: monthly_salary/salary_months）
    p = dict(payload) if payload else {}
    if "cash_monthly" in p:
        p.setdefault("monthly_salary", p.pop("cash_monthly"))
    if "months" in p and "salary_months" not in p:
        p["salary_months"] = p.pop("months")

    event = Event(
        application_id=application.id,
        type=EventType.OFFER_RECORDED.value,
        occurred_at=utc_now(),
        actor_type=actor_type,
        actor_id=actor_id,
        payload=p or None,
        body=(payload or {}).get("body"),
    )
    db.add(event)
    return event


register(
    "record_offer",
    guard=guards.guard_offer_recorded,
    handler=handle_offer_recorded,
)
register(
    "confirm_hire",
    guard=guards.guard_hire_confirmed,
    handler=handle_hire_confirmed,
)
