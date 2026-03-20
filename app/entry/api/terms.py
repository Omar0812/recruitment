"""Term CRUD: GET / POST / PUT / DELETE / PATCH reorder"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.audit import log_audit
from app.engine.version import check_version, bump_version
from app.entry.deps import current_user
from app.models.enums import TermType
from app.models.term import Term
from app.models.user import User
from app.schemas.term import TermCreate, TermRead, TermUpdate

router = APIRouter(tags=["terms"])


def _list_terms(db: Session, term_type: str) -> list[TermRead]:
    items = (
        db.query(Term)
        .filter(Term.type == term_type)
        .order_by(Term.sort_order, Term.id)
        .all()
    )
    return [TermRead.model_validate(t) for t in items]


def _check_duplicate(db: Session, term_type: str, name: str, exclude_id: int | None = None):
    q = db.query(Term).filter(Term.type == term_type, Term.name == name)
    if exclude_id is not None:
        q = q.filter(Term.id != exclude_id)
    if q.first() is not None:
        raise HTTPException(409, f"名称 '{name}' 已存在")


# ── GET lists ──

@router.get("/departments", response_model=list[TermRead])
def list_departments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _list_terms(db, TermType.DEPARTMENT.value)


@router.get("/locations", response_model=list[TermRead])
def list_locations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _list_terms(db, TermType.LOCATION.value)


@router.get("/source-tags", response_model=list[TermRead])
def list_source_tags(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Term)
        .filter(Term.type.in_([TermType.PLATFORM.value, TermType.OTHER.value]))
        .order_by(Term.sort_order, Term.id)
        .all()
    )
    return [TermRead.model_validate(t) for t in items]


# ── POST create ──

@router.post("/departments", response_model=TermRead, status_code=201)
def create_department(body: TermCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    body.type = TermType.DEPARTMENT.value
    return _create_term(db, body, user.id)


@router.post("/locations", response_model=TermRead, status_code=201)
def create_location(body: TermCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    body.type = TermType.LOCATION.value
    return _create_term(db, body, user.id)


@router.post("/source-tags", response_model=TermRead, status_code=201)
def create_source_tag(body: TermCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.type not in (TermType.PLATFORM.value, TermType.OTHER.value):
        raise HTTPException(400, "type must be 'platform' or 'other'")
    return _create_term(db, body, user.id)


def _create_term(db: Session, body: TermCreate, actor_id: int) -> TermRead:
    _check_duplicate(db, body.type, body.name)
    if body.sort_order == 0:
        max_order = (
            db.query(Term.sort_order)
            .filter(Term.type == body.type)
            .order_by(Term.sort_order.desc())
            .first()
        )
        body.sort_order = (max_order[0] + 1) if max_order else 0
    term = Term(**body.model_dump())
    db.add(term)
    db.flush()
    log_audit(
        db,
        actor_type="human",
        action_code="create_term",
        target_type="term",
        target_id=term.id,
        actor_id=actor_id,
        details=body.model_dump(),
    )
    db.commit()
    db.refresh(term)
    return TermRead.model_validate(term)


# ── PUT update ──

@router.put("/terms/{term_id}", response_model=TermRead)
def update_term(term_id: int, body: TermUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    term = db.get(Term, term_id)
    if term is None:
        raise HTTPException(404, "Term not found")
    check_version(term, body.version)
    _check_duplicate(db, term.type, body.name, exclude_id=term_id)
    term.name = body.name
    if body.address is not None:
        term.address = body.address
    elif term.type != TermType.LOCATION.value:
        term.address = None
    bump_version(term)
    log_audit(
        db,
        actor_type="human",
        action_code="update_term",
        target_type="term",
        target_id=term_id,
        actor_id=user.id,
        details={"name": body.name, "address": body.address},
    )
    db.commit()
    db.refresh(term)
    return TermRead.model_validate(term)


# ── DELETE ──

@router.delete("/terms/{term_id}", status_code=204)
def delete_term(term_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    term = db.get(Term, term_id)
    if term is None:
        raise HTTPException(404, "Term not found")
    log_audit(
        db,
        actor_type="human",
        action_code="delete_term",
        target_type="term",
        target_id=term_id,
        actor_id=user.id,
    )
    db.delete(term)
    db.commit()


# ── PATCH reorder ──

class ReorderItem(BaseModel):
    id: int
    sort_order: int


class ReorderRequest(BaseModel):
    items: List[ReorderItem]


@router.patch("/terms/reorder", status_code=204)
def reorder_terms(body: ReorderRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for item in body.items:
        term = db.get(Term, item.id)
        if term is not None:
            term.sort_order = item.sort_order
    log_audit(
        db,
        actor_type="human",
        action_code="reorder_terms",
        target_type="term",
        target_id=0,
        actor_id=user.id,
        details={"items": [i.model_dump() for i in body.items]},
    )
    db.commit()


# ── Stats ──

@router.get("/source-tags/stats")
def source_tag_stats(user: User = Depends(current_user), db: Session = Depends(get_db)):
    from app.models.application import Application
    from app.models.enums import ApplicationState
    from app.models.legacy import Candidate

    tags = (
        db.query(Term)
        .filter(Term.type.in_([TermType.PLATFORM.value, TermType.OTHER.value]))
        .order_by(Term.sort_order, Term.id)
        .all()
    )
    result = []
    for tag in tags:
        candidate_count = (
            db.query(Candidate)
            .filter(Candidate.source == tag.name)
            .count()
        )
        hired_count = (
            db.query(Application)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .filter(
                Candidate.source == tag.name,
                Application.state == ApplicationState.HIRED.value,
            )
            .count()
        )
        result.append({
            "id": tag.id,
            "name": tag.name,
            "candidate_count": candidate_count,
            "hired_count": hired_count,
        })
    return result
