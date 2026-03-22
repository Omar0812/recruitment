from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import AppBaseModel


class ExpenseBase(BaseModel):
    channel_type: str
    channel_id: int
    amount: float
    occurred_at: datetime
    description: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    version: Optional[int] = None


class ExpenseRead(ExpenseBase, AppBaseModel):

    id: int
    version: int = 1
    created_at: datetime
    updated_at: datetime
