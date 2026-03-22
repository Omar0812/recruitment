from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import AppBaseModel


class SupplierBase(BaseModel):
    name: str
    type: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    owner: Optional[str] = None
    guarantee_months: Optional[int] = None
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    contract_terms: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    version: Optional[int] = None


class SupplierRead(SupplierBase, AppBaseModel):

    id: int
    version: int = 1
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
