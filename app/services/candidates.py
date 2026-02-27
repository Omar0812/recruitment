from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Candidate, HistoryEntry

VALID_BLACKLIST_REASONS = {"简历造假", "背调不通过", "职业道德问题", "面试失约", "其他"}


def blacklist_candidate(
    db: Session,
    candidate: Candidate,
    reason: str,
    note: Optional[str] = None,
) -> Candidate:
    if reason not in VALID_BLACKLIST_REASONS:
        raise HTTPException(status_code=400, detail="无效的黑名单原因")
    candidate.blacklisted = True
    candidate.blacklist_reason = reason
    candidate.blacklist_note = note
    candidate.updated_at = datetime.utcnow()
    db.add(HistoryEntry(
        candidate_id=candidate.id,
        event_type="blacklisted",
        detail=f"加入黑名单：{reason}",
    ))
    db.commit()
    db.refresh(candidate)
    return candidate


def unblacklist_candidate(
    db: Session,
    candidate: Candidate,
    reason: str,
) -> Candidate:
    if not candidate.blacklisted:
        raise HTTPException(status_code=400, detail="候选人未在黑名单中")
    candidate.blacklisted = False
    candidate.blacklist_reason = None
    candidate.blacklist_note = None
    candidate.updated_at = datetime.utcnow()
    db.add(HistoryEntry(
        candidate_id=candidate.id,
        event_type="unblacklisted",
        detail=f"解除黑名单：{reason}",
    ))
    db.commit()
    db.refresh(candidate)
    return candidate
