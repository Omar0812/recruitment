"""Supplier CRUD: GET / POST / PUT / DELETE (soft) + stats + headhunter fees"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.engine.audit import log_audit
from app.engine.version import check_version, bump_version
from app.entry.deps import current_user
from app.models.application import Application
from app.models.enums import ApplicationState
from app.models.event import Event
from app.models.legacy import Candidate, Supplier
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=PaginatedResponse[SupplierRead])
def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_deleted: bool = Query(False),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Supplier)
    if not include_deleted:
        q = q.filter(Supplier.deleted_at.is_(None))
    total = q.count()
    items = q.order_by(Supplier.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(supplier_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Supplier, supplier_id)
    if s is None:
        raise HTTPException(404, "Supplier not found")
    return s


@router.post("", response_model=SupplierRead, status_code=201)
def create_supplier(body: SupplierCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    supplier = Supplier(**body.model_dump(exclude_none=True))
    db.add(supplier)
    db.flush()
    log_audit(
        db,
        actor_type="human",
        action_code="create_supplier",
        target_type="supplier",
        target_id=supplier.id,
        actor_id=user.id,
        details=body.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=SupplierRead)
def update_supplier(supplier_id: int, body: SupplierUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Supplier, supplier_id)
    if s is None:
        raise HTTPException(404, "Supplier not found")
    check_version(s, body.version)
    update_data = body.model_dump(exclude_unset=True, exclude={"version"})
    for key, value in update_data.items():
        setattr(s, key, value)
    bump_version(s)
    log_audit(
        db,
        actor_type="human",
        action_code="update_supplier",
        target_type="supplier",
        target_id=supplier_id,
        actor_id=user.id,
        details=update_data,
    )
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Supplier, supplier_id)
    if s is None:
        raise HTTPException(404, "Supplier not found")
    s.deleted_at = datetime.now(timezone.utc)
    log_audit(
        db,
        actor_type="human",
        action_code="delete_supplier",
        target_type="supplier",
        target_id=supplier_id,
        actor_id=user.id,
    )
    db.commit()


@router.get("/{supplier_id}/stats")
def supplier_stats(supplier_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Supplier, supplier_id)
    if s is None:
        raise HTTPException(404, "Supplier not found")
    total = db.query(Candidate).filter(Candidate.supplier_id == supplier_id).count()
    hired = (
        db.query(Application)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(
            Candidate.supplier_id == supplier_id,
            Application.state == ApplicationState.HIRED.value,
        )
        .count()
    )
    return {"supplier_id": supplier_id, "candidate_count": total, "hired_count": hired}


@router.get("/{supplier_id}/headhunter-fees")
def supplier_headhunter_fees(supplier_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """聚合该猎头所有已入职候选人的猎头费明细。"""
    s = db.get(Supplier, supplier_id)
    if s is None:
        raise HTTPException(404, "Supplier not found")

    hired_apps = (
        db.query(Application)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(
            Candidate.supplier_id == supplier_id,
            Application.state == ApplicationState.HIRED.value,
        )
        .options(joinedload(Application.candidate))
        .all()
    )
    if not hired_apps:
        return []

    app_ids = [a.id for a in hired_apps]
    app_map = {a.id: a for a in hired_apps}

    from sqlalchemy import and_

    latest_offer_subq = (
        db.query(
            Event.application_id,
            func.max(Event.occurred_at).label("max_occurred"),
        )
        .filter(Event.application_id.in_(app_ids), Event.type == "offer_recorded")
        .group_by(Event.application_id)
        .subquery()
    )
    offer_events = (
        db.query(Event)
        .join(
            latest_offer_subq,
            and_(
                Event.application_id == latest_offer_subq.c.application_id,
                Event.occurred_at == latest_offer_subq.c.max_occurred,
                Event.type == "offer_recorded",
            ),
        )
        .all()
    )

    latest_hire_subq = (
        db.query(
            Event.application_id,
            func.max(Event.occurred_at).label("max_occurred"),
        )
        .filter(Event.application_id.in_(app_ids), Event.type == "hire_confirmed")
        .group_by(Event.application_id)
        .subquery()
    )
    hire_events = (
        db.query(Event)
        .join(
            latest_hire_subq,
            and_(
                Event.application_id == latest_hire_subq.c.application_id,
                Event.occurred_at == latest_hire_subq.c.max_occurred,
                Event.type == "hire_confirmed",
            ),
        )
        .all()
    )
    # hire_date fallback 链：payload.hire_date → offer.onboard_date → occurred_at
    offer_payload_map = {e.application_id: (e.payload or {}) for e in offer_events}
    hire_date_map: dict[int, str] = {}
    for e in hire_events:
        hire_payload = e.payload or {}
        hd = hire_payload.get("hire_date")
        if not hd:
            offer_p = offer_payload_map.get(e.application_id, {})
            hd = offer_p.get("onboard_date")
        if not hd:
            hd = e.occurred_at.isoformat()[:10]
        hire_date_map[e.application_id] = str(hd)[:10]

    result = []
    for event in offer_events:
        payload = event.payload or {}
        fee = float(payload.get("headhunter_fee", 0) or 0)
        if fee <= 0:
            continue
        app = app_map.get(event.application_id)
        if not app or not app.candidate:
            continue
        result.append({
            "candidate_name": app.candidate.name,
            "headhunter_fee": fee,
            "hire_date": hire_date_map.get(event.application_id, ""),
            "application_id": event.application_id,
        })

    result.sort(key=lambda x: x["hire_date"], reverse=True)
    return result
