from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Supplier, Candidate

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str
    type: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


def supplier_to_dict(s: Supplier) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "type": s.type,
        "contact_name": s.contact_name,
        "phone": s.phone,
        "email": s.email,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("")
def list_suppliers(q: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Supplier)
    if q:
        query = query.filter(Supplier.name.ilike(f"%{q}%"))
    return [supplier_to_dict(s) for s in query.order_by(Supplier.name).all()]


@router.post("")
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    s = Supplier(
        name=data.name,
        type=data.type,
        contact_name=data.contact_name,
        phone=data.phone,
        email=data.email,
        notes=data.notes,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return supplier_to_dict(s)


@router.patch("/{supplier_id}")
def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="供应商不存在")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(s, field, val)
    db.commit()
    db.refresh(s)
    return supplier_to_dict(s)


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
