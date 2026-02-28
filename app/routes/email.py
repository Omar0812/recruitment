from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import json
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header

from app.database import get_db
from app.models import CandidateJobLink, ActivityRecord

router = APIRouter(prefix="/api/email", tags=["email"])

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config.json")


def _read_config() -> dict:
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _render_template(template: str, variables: dict) -> str:
    result = template
    for key, value in variables.items():
        result = result.replace("{{" + key + "}}", str(value) if value else "")
    return result


class SendInviteRequest(BaseModel):
    link_id: int


@router.post("/send-interview-invite")
def send_interview_invite(req: SendInviteRequest, db: Session = Depends(get_db)):
    cfg = _read_config()
    email_cfg = cfg.get("email", {})

    smtp_host = email_cfg.get("smtp_host", "")
    smtp_port = email_cfg.get("smtp_port", 465)
    smtp_user = email_cfg.get("smtp_user", "")
    smtp_password = email_cfg.get("smtp_password", "")
    from_name = email_cfg.get("from_name", "招聘团队")
    use_ssl = email_cfg.get("use_ssl", True)
    template = email_cfg.get("interview_invite_template", "")

    if not smtp_host or not smtp_user or not smtp_password:
        raise HTTPException(status_code=400, detail="SMTP_NOT_CONFIGURED")

    # 查询 link、candidate、job
    link = (
        db.query(CandidateJobLink)
        .options(
            joinedload(CandidateJobLink.candidate),
            joinedload(CandidateJobLink.job),
            joinedload(CandidateJobLink.activity_records),
        )
        .filter(CandidateJobLink.id == req.link_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="流程记录不存在")

    candidate = link.candidate
    job = link.job

    if not candidate or not candidate.email:
        raise HTTPException(status_code=400, detail="候选人未填写邮箱")

    # 找最近一条 scheduled 面试
    interview = next(
        (
            r for r in sorted(link.activity_records, key=lambda x: x.id, reverse=True)
            if r.type == "interview" and r.status == "scheduled"
        ),
        None,
    )

    p = interview.payload or {} if interview else {}

    def _fmt_date(dt):
        if not dt:
            return ""
        import datetime
        if isinstance(dt, str):
            try:
                dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                return dt
        return dt.strftime("%Y年%m月%d日")

    def _fmt_time(dt):
        if not dt:
            return ""
        import datetime
        if isinstance(dt, str):
            try:
                dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                return dt
        return dt.strftime("%H:%M")

    scheduled_at = interview.scheduled_at if interview else None
    variables = {
        "candidate_name": candidate.name or "",
        "job_title": job.title if job else "",
        "date": _fmt_date(scheduled_at),
        "time": _fmt_time(scheduled_at),
        "location": p.get("location") or (interview.location if interview else "") or "",
        "interviewer": p.get("actor") or (interview.actor if interview else "") or "",
        "company_name": from_name,
    }

    body = _render_template(template, variables) if template else f"您好 {candidate.name}，请查收面试邀约详情。"

    # 构建邮件
    msg = MIMEMultipart()
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = candidate.email
    msg["Subject"] = Header(f"面试邀约 - {job.title if job else '职位面试'}", "utf-8")
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=15) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [candidate.email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [candidate.email], msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=500, detail="SMTP 认证失败，请检查设置页邮件配置")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"邮件发送失败：{str(e)}")

    return {"ok": True, "sent_to": candidate.email}
