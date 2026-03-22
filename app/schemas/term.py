from typing import Optional

from pydantic import BaseModel

from app.schemas.base import AppBaseModel


class TermBase(BaseModel):
    type: str
    name: str
    sort_order: int = 0
    address: Optional[str] = None


class TermCreate(TermBase):
    pass


class TermUpdate(BaseModel):
    name: str
    address: Optional[str] = None
    version: Optional[int] = None


class TermRead(TermBase, AppBaseModel):

    id: int
    version: int = 1
