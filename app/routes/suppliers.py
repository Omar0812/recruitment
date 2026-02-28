from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models import Supplier, Candidate
from app.schemas import SupplierOut

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


def _is_headhunter(supplier_type: Optional[str]) -> bool:
    return bool(supplier_type and "猎头" in supplier_type)


class SupplierCreate(BaseModel):
    name: str
    type: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    fee_guarantee_days: Optional[int] = Field(default=None, ge=0)


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    fee_guarantee_days: Optional[int] = Field(default=None, ge=0)


def _supplier_out(s: Supplier) -> dict:
    data = SupplierOut.model_validate(s).model_dump()
    if not _is_headhunter(data.get("type")):
        data["fee_guarantee_days"] = None
    return data


@router.get("")
def list_suppliers(q: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Supplier)
    if q:
        query = query.filter(Supplier.name.ilike(f"%{q}%"))
    return [_supplier_out(s) for s in query.order_by(Supplier.name).all()]


@router.post("")
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    guarantee_days = data.fee_guarantee_days if _is_headhunter(data.type) else None
    s = Supplier(
        name=data.name,
        type=data.type,
        contact_name=data.contact_name,
        phone=data.phone,
        email=data.email,
        notes=data.notes,
        fee_guarantee_days=guarantee_days,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _supplier_out(s)


@router.patch("/{supplier_id}")
def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="供应商不存在")
    payload = data.model_dump(exclude_unset=True)
    next_type = payload.get("type", s.type)
    if "fee_guarantee_days" in payload:
        payload["fee_guarantee_days"] = payload["fee_guarantee_days"] if _is_headhunter(next_type) else None
    elif not _is_headhunter(next_type):
        payload["fee_guarantee_days"] = None
    for field, val in payload.items():
        setattr(s, field, val)
    db.commit()
    db.refresh(s)
    return _supplier_out(s)


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="供应商不存在")
    linked = db.query(Candidate).filter(Candidate.supplier_id == supplier_id, Candidate.deleted_at.is_(None)).first()
    if linked:
        raise HTTPException(status_code=400, detail="该供应商已关联候选人，无法删除")
    db.delete(s)
    db.commit()
    return {"ok": True}
