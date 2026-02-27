from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.database import get_db
from app.models import CandidateJobLink, ActivityRecord

router = APIRouter(prefix="/api/applications", tags=["applications"])

IN_PROGRESS_ACTIONS = [
    {"id": "add_note",      "label": "添加备注",     "method": "POST", "url": "/api/activities"},
    {"id": "add_interview", "label": "安排面试",     "method": "POST", "url": "/api/activities"},
    {"id": "add_offer",     "label": "发送 Offer",   "method": "POST", "url": "/api/activities"},
    {"id": "reject",        "label": "淘汰",         "method": "PATCH", "url": "/api/pipeline/link/{link_id}/outcome"},
    {"id": "withdraw",      "label": "候选人退出",   "method": "PATCH", "url": "/api/pipeline/link/{link_id}/withdraw"},
    {"id": "hire",          "label": "确认入职",     "method": "PATCH", "url": "/api/pipeline/link/{link_id}/hire"},
]

TERMINAL_STATES = {"HIRED", "REJECTED", "WITHDRAWN"}


def _get_link(link_id: int, db: Session) -> CandidateJobLink:
    lnk = (
        db.query(CandidateJobLink)
        .options(
            joinedload(CandidateJobLink.candidate),
            joinedload(CandidateJobLink.job),
            joinedload(CandidateJobLink.activity_records),
        )
        .filter(CandidateJobLink.id == link_id)
        .first()
    )
    if not lnk:
        raise HTTPException(status_code=404, detail="关联不存在")
    return lnk


def _build_alerts(lnk: CandidateJobLink) -> list:
    alerts = []
    now = datetime.utcnow()

    # P1: scheduled interview older than 2 days without completion
    for r in lnk.activity_records:
        if r.type == "interview" and r.status == "scheduled" and r.scheduled_at:
            delta = (now - r.scheduled_at).days
            if delta >= 2:
                alerts.append({"level": "P1", "message": "面试完成超2天未录面评"})
                break

    # P2: stale pipeline > 7 days
    if lnk.state == "IN_PROGRESS" and lnk.updated_at:
        days_stale = (now - lnk.updated_at).days
        if days_stale > 7:
            alerts.append({"level": "P2", "message": f"流程已停滞 {days_stale} 天"})

    return alerts


def _get_actions(lnk: CandidateJobLink) -> list:
    if lnk.state in TERMINAL_STATES:
        return []
    return [
        {**a, "url": a["url"].replace("{link_id}", str(lnk.id))}
        for a in IN_PROGRESS_ACTIONS
    ]


@router.get("/{link_id}/context")
def get_context(link_id: int, db: Session = Depends(get_db)):
    lnk = _get_link(link_id, db)
    c = lnk.candidate
    j = lnk.job
    now = datetime.utcnow()

    last_activity = max(lnk.activity_records, key=lambda r: r.created_at, default=None)
    days_stale = (now - last_activity.created_at).days if last_activity else None

    timeline = sorted(lnk.activity_records, key=lambda r: r.created_at)

    return {
        "application": {
            "id": lnk.id,
            "state": lnk.state,
            "stage": lnk.stage,
            "outcome": lnk.outcome,
            "days_stale": days_stale,
        },
        "candidate": {
            "id": c.id if c else None,
            "name": c.name if c else None,
            "last_title": c.last_title if c else None,
            "last_company": c.last_company if c else None,
            "years_exp": c.years_exp if c else None,
            "source": c.source if c else None,
            "tags": c.skill_tags if c else [],
        },
        "job": {
            "id": j.id if j else None,
            "title": j.title if j else None,
            "department": j.department if j else None,
            "priority": j.priority if j else None,
        },
        "timeline": [
            {
                "id": r.id,
                "type": r.type,
                "stage": r.stage,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "actor": r.actor,
                "conclusion": r.conclusion,
                "comment": r.comment,
                "status": r.status,
                "round": r.round,
                "score": r.score,
            }
            for r in timeline
        ],
        "available_actions": [a["id"] for a in _get_actions(lnk)],
        "alerts": _build_alerts(lnk),
        "ai_context": None,
    }


@router.get("/{link_id}/actions")
def get_actions(link_id: int, db: Session = Depends(get_db)):
    lnk = _get_link(link_id, db)
    return {"actions": _get_actions(lnk)}
