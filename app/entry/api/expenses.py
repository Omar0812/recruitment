"""Expense CRUD: GET / POST / PUT / DELETE"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.audit import log_audit
from app.engine.version import check_version, bump_version
from app.entry.deps import current_user
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=PaginatedResponse[ExpenseRead])
def list_expenses(
    channel_type: Optional[str] = None,
    channel_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Expense)
    if channel_type:
        q = q.filter(Expense.channel_type == channel_type)
    if channel_id is not None:
        q = q.filter(Expense.channel_id == channel_id)
    total = q.count()
    items = (
        q.order_by(Expense.occurred_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense(body: ExpenseCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    expense = Expense(**body.model_dump(exclude={"version"}))
    db.add(expense)
    db.flush()
    log_audit(
        db,
        actor_type="human",
        action_code="create_expense",
        target_type="expense",
        target_id=expense.id,
        actor_id=user.id,
        details=jsonable_encoder(body.model_dump(exclude={"version"})),
    )
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, body: ExpenseCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = db.get(Expense, expense_id)
    if e is None:
        raise HTTPException(404, "Expense not found")
    check_version(e, body.version)
    for key, value in body.model_dump(exclude={"version"}).items():
        setattr(e, key, value)
    bump_version(e)
    log_audit(
        db,
        actor_type="human",
        action_code="update_expense",
        target_type="expense",
        target_id=expense_id,
        actor_id=user.id,
        details=jsonable_encoder(body.model_dump()),
    )
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = db.get(Expense, expense_id)
    if e is None:
        raise HTTPException(404, "Expense not found")
    log_audit(
        db,
        actor_type="human",
        action_code="delete_expense",
        target_type="expense",
        target_id=expense_id,
        actor_id=user.id,
    )
    db.delete(e)
    db.commit()
