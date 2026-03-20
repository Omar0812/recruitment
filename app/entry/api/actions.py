"""POST /actions/execute + GET /actions/catalog + GET /actions/available"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.executor import execute as engine_execute
from app.engine.entity_writer import write as entity_write
from app.engine.errors import BusinessError
from app.engine.registry import all_codes, get as get_action
from app.entry.deps import current_user
from app.models.application import Application
from app.models.enums import ApplicationState
from app.models.legacy import Candidate
from app.models.legacy import Job
from app.models.user import User
from app.schemas.action import (
    ActionCatalogItem,
    ActionExecuteResponse,
    ActionRequest,
)

router = APIRouter(prefix="/actions", tags=["actions"])


def _sync_resume_path_to_attachments(candidate: Candidate, resume_path: str) -> None:
    """当 resume_path 被设置时，同步更新 attachments 中 type=resume 的条目。"""
    attachments = list(candidate.attachments or [])
    entry = {
        "file_path": resume_path,
        "label": "简历",
        "type": "resume",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    replaced = False
    for i, att in enumerate(attachments):
        if att.get("type") == "resume":
            attachments[i] = entry
            replaced = True
            break
    if not replaced:
        attachments.insert(0, entry)
    candidate.attachments = attachments

_CANDIDATE_MUTABLE_FIELDS = {
    "name",
    "phone",
    "email",
    "age",
    "education",
    "school",
    "city",
    "last_company",
    "last_title",
    "years_exp",
    "name_en",
    "education_list",
    "work_experience",
    "project_experience",
    "skill_tags",
    "source",
    "referred_by",
    "supplier_id",
    "notes",
    "blacklisted",
    "blacklist_reason",
    "blacklist_note",
    "resume_path",
    "attachments",
    "followup_status",
    "merged_into",
    "starred",
}


def _receipt_to_response(receipt, *, message: Optional[str] = None) -> ActionExecuteResponse:
    return ActionExecuteResponse(
        ok=receipt.ok,
        command_id=receipt.command_id,
        action_code=receipt.action_code,
        target_type=receipt.target_type,
        target_id=receipt.target_id,
        state_before=receipt.state_before,
        state_after=receipt.state_after,
        stage_before=receipt.stage_before,
        stage_after=receipt.stage_after,
        error_code=receipt.error_code,
        error_message=receipt.error_message,
        message=message,
    )


def _build_entity_mutate(req: ActionRequest, db: Session):
    if req.target.type != "candidate":
        return None

    candidate = db.get(Candidate, req.target.id)
    if candidate is None:
        raise HTTPException(404, "Candidate not found")

    if req.action_code == "update_candidate":
        payload = {
            key: value
            for key, value in req.payload.items()
            if key in _CANDIDATE_MUTABLE_FIELDS
        }

        def _mutate(_: Session) -> None:
            for key, value in payload.items():
                setattr(candidate, key, value)
            if "resume_path" in payload and payload["resume_path"]:
                _sync_resume_path_to_attachments(candidate, payload["resume_path"])

        return _mutate

    if req.action_code == "unblacklist_candidate":

        def _mutate(_: Session) -> None:
            candidate.blacklisted = False
            candidate.blacklist_reason = None
            candidate.blacklist_note = None

        return _mutate

    if req.action_code != "blacklist_candidate":
        return None

    reason = str(req.payload.get("reason") or "").strip()
    if not reason:
        raise BusinessError("blacklist_reason_required", "加入黑名单时必须提供原因")

    note = str(req.payload.get("note") or "").strip() or None

    def _mutate(_: Session) -> None:
        candidate.blacklisted = True
        candidate.blacklist_reason = reason
        candidate.blacklist_note = note

    return _mutate


@router.post("/execute", response_model=ActionExecuteResponse)
def execute_action(
    req: ActionRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    actor_type = "human"
    actor_id = user.id

    if req.target.type == "candidate" and req.action_code == "create_application":
        candidate = db.get(Candidate, req.target.id)
        if candidate is None:
            raise HTTPException(404, "Candidate not found")

        job_id = req.payload.get("job_id")
        if not isinstance(job_id, int):
            raise BusinessError("job_id_required", "加入流程时必须提供岗位")

        job = db.get(Job, job_id)
        if job is None:
            raise HTTPException(404, "Job not found")

        existing_active = (
            db.query(Application)
            .filter(
                Application.candidate_id == candidate.id,
                Application.state == ApplicationState.IN_PROGRESS.value,
            )
            .first()
        )
        if existing_active is not None:
            raise BusinessError("candidate_already_in_progress", "此候选人当前正在流程中")

        application = Application(
            candidate_id=candidate.id,
            job_id=job.id,
            state=ApplicationState.IN_PROGRESS.value,
        )
        db.add(application)
        db.flush()
        receipt = engine_execute(
            db,
            action_code=req.action_code,
            application=application,
            payload=req.payload,
            actor_type=actor_type,
            actor_id=actor_id,
            command_id=str(req.command_id),
        )
        if not receipt.ok:
            raise BusinessError(receipt.error_code, receipt.error_message)
        return _receipt_to_response(receipt, message="操作成功")

    if req.target.type == "application":
        app_obj = db.get(Application, req.target.id)
        if app_obj is None:
            raise HTTPException(404, "Application not found")
        receipt = engine_execute(
            db,
            action_code=req.action_code,
            application=app_obj,
            payload=req.payload,
            actor_type=actor_type,
            actor_id=actor_id,
            command_id=str(req.command_id),
        )
        if not receipt.ok:
            raise BusinessError(receipt.error_code, receipt.error_message)
        return _receipt_to_response(receipt, message="操作成功")
    else:
        receipt = entity_write(
            db,
            action_code=req.action_code,
            target_type=req.target.type,
            target_id=req.target.id,
            actor_type=actor_type,
            actor_id=actor_id,
            command_id=str(req.command_id),
            details=req.payload or None,
            mutate=_build_entity_mutate(req, db),
        )
        if not receipt.ok:
            raise BusinessError(receipt.error_code, receipt.error_message)
        return _receipt_to_response(receipt, message="操作成功")


@router.get("/catalog", response_model=list[ActionCatalogItem])
def action_catalog(user: User = Depends(current_user)):
    result = []
    for code in all_codes():
        action_def = get_action(code)
        result.append(ActionCatalogItem(
            action_code=code,
            target_type=action_def.target_type,
        ))
    return result


@router.get("/available", response_model=list[ActionCatalogItem])
def available_actions(
    target_type: str,
    target_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if target_type != "application":
        return []
    app_obj = db.get(Application, target_id)
    if app_obj is None:
        raise HTTPException(404, "Application not found")
    result = []
    for code in all_codes():
        action_def = get_action(code)
        if action_def.target_type != "application":
            continue
        try:
            action_def.guard(app_obj, {})
            result.append(ActionCatalogItem(
                action_code=code,
                target_type=action_def.target_type,
            ))
        except BusinessError:
            pass
    return result
