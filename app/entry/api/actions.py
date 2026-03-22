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
from app.utils.time import to_utc_z, utc_now

router = APIRouter(prefix="/actions", tags=["actions"])


def _sync_resume_path_to_attachments(candidate: Candidate, resume_path: str) -> None:
    """当 resume_path 被设置时，同步更新 attachments 中 type=resume 的条目。"""
    attachments = list(candidate.attachments or [])
    entry = {
        "file_path": resume_path,
        "label": "简历",
        "type": "resume",
        "created_at": to_utc_z(utc_now()),
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
        event_ids=getattr(receipt, '_event_ids', []),
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

    if req.action_code == "blacklist_candidate":
        reason = str(req.payload.get("reason") or "").strip()
        if not reason:
            raise BusinessError("blacklist_reason_required", "加入黑名单时必须提供原因")

        note = str(req.payload.get("note") or "").strip() or None

        def _mutate(_: Session) -> None:
            candidate.blacklisted = True
            candidate.blacklist_reason = reason
            candidate.blacklist_note = note

        return _mutate

    if req.action_code == "merge_candidate":
        source_id = req.payload.get("source_candidate_id")
        if not isinstance(source_id, int):
            raise BusinessError("source_candidate_id_required", "合并时必须提供被吸收方 ID")

        source = db.get(Candidate, source_id)
        if source is None:
            raise HTTPException(404, "Source candidate not found")

        # target = 主档案 (req.target.id), source = 被吸收方
        target = candidate
        # 闭包容器：让 mutate 内部的统计数据传递到外层
        merge_stats: dict = {}

        def _mutate(session: Session) -> None:
            # ── 守卫 ──
            target_active = (
                session.query(Application)
                .filter(
                    Application.candidate_id == target.id,
                    Application.state == ApplicationState.IN_PROGRESS.value,
                )
                .first()
            )
            source_active = (
                session.query(Application)
                .filter(
                    Application.candidate_id == source.id,
                    Application.state == ApplicationState.IN_PROGRESS.value,
                )
                .first()
            )
            if target_active and source_active:
                raise BusinessError(
                    "both_in_progress",
                    "请先结束其中一个流程再合并",
                )
            if target.blacklisted or source.blacklisted:
                raise BusinessError(
                    "blacklisted",
                    "请先处理黑名单状态再合并",
                )

            # ── 标量字段补空 ──
            scalar_fields = [
                "phone", "email", "education", "school", "age",
                "years_exp", "last_company", "last_title", "city",
                "name_en", "notes",
            ]
            for field in scalar_fields:
                target_val = getattr(target, field, None)
                source_val = getattr(source, field, None)
                if not target_val and source_val:
                    setattr(target, field, source_val)

            # ── starred 合并 ──
            if source.starred:
                target.starred = 1

            # ── attachments 追加（按 file_path 去重） ──
            target_attachments = list(target.attachments or [])
            source_attachments = list(source.attachments or [])
            existing_paths = {a.get("file_path") for a in target_attachments}
            for att in source_attachments:
                if att.get("file_path") and att["file_path"] not in existing_paths:
                    target_attachments.append(att)
                    existing_paths.add(att["file_path"])
            target.attachments = target_attachments

            # ── Application 转移 ──
            apps_to_transfer = (
                session.query(Application)
                .filter(Application.candidate_id == source.id)
                .all()
            )
            for app in apps_to_transfer:
                app.candidate_id = target.id

            # ── 被吸收方标记 ──
            source.merged_into = target.id

            # 统计数据传出
            merge_stats["transferred_applications"] = len(apps_to_transfer)

        return _mutate, merge_stats

    return None


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
        mutate_result = _build_entity_mutate(req, db)
        # merge_candidate 返回 (mutate, stats) 元组
        if isinstance(mutate_result, tuple):
            mutate_fn, merge_stats = mutate_result
            details = {
                "target_id": req.target.id,
                "source_candidate_id": req.payload.get("source_candidate_id"),
            }
            receipt = entity_write(
                db,
                action_code=req.action_code,
                target_type=req.target.type,
                target_id=req.target.id,
                actor_type=actor_type,
                actor_id=actor_id,
                command_id=str(req.command_id),
                details={**details, **merge_stats},
                mutate=mutate_fn,
            )
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
                mutate=mutate_result,
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
