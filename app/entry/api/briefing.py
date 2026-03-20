"""GET /briefing/today"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.entry.deps import current_user
from app.models.user import User
from app.query.briefing import get_today_briefing

router = APIRouter(prefix="/briefing", tags=["briefing"])


@router.get("/today")
def today_briefing(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return get_today_briefing(db)
