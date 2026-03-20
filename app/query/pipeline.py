from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.enums import ApplicationState


def list_active_pipeline(db: Session, *, page: int = 1, page_size: int = 20):
    q = db.query(Application).filter(Application.state == ApplicationState.IN_PROGRESS.value)
    total = q.count()
    items = q.order_by(Application.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}
