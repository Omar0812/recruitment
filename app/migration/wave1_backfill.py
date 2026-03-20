from __future__ import annotations

import json
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.engine.stage import derive
from app.models.application import Application
from app.migration.type_mapping import ACTIVITY_TYPE_TO_EVENT_TYPE, STAGE_TO_EVENT_TYPE


def _map_activity_to_event_type(
    activity_type: str | None,
    to_stage: str | None,
    status: str | None,
) -> str:
    if activity_type == "stage_change" and to_stage:
        return STAGE_TO_EVENT_TYPE.get(to_stage, "note")
    if activity_type == "interview" and status == "scheduled":
        return "interview_scheduled"
    return ACTIVITY_TYPE_TO_EVENT_TYPE.get(activity_type or "", "note")


def _build_payload(row: dict) -> dict | None:
    activity_type = row.get("type")
    payload: dict = {}

    if activity_type in ("interview", "phone_screen"):
        if row.get("round"):
            payload["interview_round"] = row["round"]
        if row.get("score") is not None:
            payload["score"] = row["score"]
        if row.get("scheduled_at"):
            payload["scheduled_at"] = str(row["scheduled_at"])
        if row.get("location"):
            payload["meeting_type"] = row["location"]
        if row.get("actor"):
            payload["interviewer"] = row["actor"]
        if row.get("conclusion"):
            payload["result"] = "pass" if row["conclusion"] == "通过" else "reject"
        if row.get("comment"):
            payload["summary"] = row["comment"]
    elif activity_type == "offer":
        if row.get("salary"):
            payload["cash_monthly"] = row["salary"]
        if row.get("start_date"):
            payload["onboard_date"] = row["start_date"]
    elif activity_type == "resume_review":
        if row.get("conclusion"):
            payload["result"] = "pass" if row["conclusion"] == "通过" else "reject"
        if row.get("comment"):
            payload["summary"] = row["comment"]

    return payload or None


def run_wave1_backfill(conn) -> None:
    now = datetime.now(timezone.utc).isoformat(sep=" ", timespec="seconds")

    conn.execute(sa.text("""
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY candidate_id
                    ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
                ) AS rn
            FROM candidate_job_links
            WHERE state = 'IN_PROGRESS'
               OR (state IS NULL AND outcome IS NULL)
        )
        UPDATE candidate_job_links
        SET state = 'WITHDRAWN',
            outcome = 'withdrawn',
            close_reason_code = 'migration_dedup',
            close_note = '迁移修复：重复在途自动关闭'
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    """))

    deduped = conn.execute(sa.text("""
        SELECT id, candidate_id, job_id FROM candidate_job_links
        WHERE close_reason_code = 'migration_dedup'
    """)).fetchall()
    for row in deduped:
        conn.execute(sa.text("""
            INSERT INTO audit_logs (actor_type, action_code, target_type, target_id, details, created_at)
            VALUES ('system', 'migration_dedup', 'candidate_job_link', :target_id, :details, :now)
        """), {
            "target_id": row[0],
            "details": json.dumps({
                "candidate_id": row[1],
                "job_id": row[2],
                "reason": "duplicate active link resolved during wave1 migration",
            }),
            "now": now,
        })

    conn.execute(sa.text("""
        INSERT INTO applications (candidate_id, job_id, state, outcome, stage, created_at, updated_at)
        SELECT
            l.candidate_id,
            l.job_id,
            COALESCE(l.state, 'IN_PROGRESS'),
            l.outcome,
            NULL,
            COALESCE(l.created_at, :now),
            COALESCE(l.updated_at, l.created_at, :now)
        FROM candidate_job_links l
        WHERE NOT EXISTS (
            SELECT 1 FROM applications a
            WHERE a.candidate_id = l.candidate_id AND a.job_id = l.job_id
        )
    """), {"now": now})

    app_rows = conn.execute(sa.text(
        "SELECT id, candidate_id, job_id FROM applications"
    )).fetchall()
    app_lookup: dict[tuple[int, int], int] = {
        (r[1], r[2]): r[0] for r in app_rows
    }

    link_rows = conn.execute(sa.text(
        "SELECT id, candidate_id, job_id FROM candidate_job_links"
    )).fetchall()
    link_to_cj: dict[int, tuple[int, int]] = {
        r[0]: (r[1], r[2]) for r in link_rows
    }

    try:
        activities = conn.execute(sa.text("""
            SELECT id, link_id, type, stage, created_at, actor, comment,
                   conclusion, rejection_reason, round, interview_time,
                   scheduled_at, location, status, score, salary, start_date,
                   from_stage, to_stage, payload
            FROM activity_records
            ORDER BY created_at ASC, id ASC
        """)).fetchall()
    except Exception:
        activities = []

    activity_columns = [
        "id", "link_id", "type", "stage", "created_at", "actor", "comment",
        "conclusion", "rejection_reason", "round", "interview_time",
        "scheduled_at", "location", "status", "score", "salary", "start_date",
        "from_stage", "to_stage", "payload",
    ]

    for act in activities:
        row = dict(zip(activity_columns, act))
        cj = link_to_cj.get(row["link_id"])
        if cj is None:
            continue
        app_id = app_lookup.get(cj)
        if app_id is None:
            continue

        existing = conn.execute(sa.text("""
            SELECT 1 FROM events
            WHERE application_id = :app_id
              AND body = :source_ref
            LIMIT 1
        """), {
            "app_id": app_id,
            "source_ref": f"__migrated_activity_{row['id']}",
        }).fetchone()
        if existing:
            continue

        event_type = _map_activity_to_event_type(
            row["type"], row.get("to_stage"), row.get("status"),
        )
        payload = _build_payload(row)
        occurred_at = row["created_at"] or now

        conn.execute(sa.text("""
            INSERT INTO events (application_id, type, occurred_at, actor_type, payload, body, created_at, updated_at)
            VALUES (:app_id, :type, :occurred_at, 'human', :payload, :body, :now, :now)
        """), {
            "app_id": app_id,
            "type": event_type,
            "occurred_at": occurred_at,
            "payload": json.dumps(payload) if payload else None,
            "body": f"__migrated_activity_{row['id']}",
            "now": now,
        })

    try:
        histories = conn.execute(sa.text("""
            SELECT id, candidate_id, job_id, event_type, detail, timestamp
            FROM history_entries
            ORDER BY timestamp ASC, id ASC
        """)).fetchall()
    except Exception:
        histories = []

    for hist in histories:
        h_id, cand_id, job_id, _, _, ts = hist
        if job_id is None:
            continue
        app_id = app_lookup.get((cand_id, job_id))
        if app_id is None:
            continue

        existing = conn.execute(sa.text("""
            SELECT 1 FROM events
            WHERE application_id = :app_id
              AND body = :source_ref
            LIMIT 1
        """), {
            "app_id": app_id,
            "source_ref": f"__migrated_history_{h_id}",
        }).fetchone()
        if existing:
            continue

        conn.execute(sa.text("""
            INSERT INTO events (application_id, type, occurred_at, actor_type, payload, body, created_at, updated_at)
            VALUES (:app_id, 'note', :occurred_at, 'system', NULL, :body, :now, :now)
        """), {
            "app_id": app_id,
            "occurred_at": ts or now,
            "body": f"__migrated_history_{h_id}",
            "now": now,
        })

    for app_id in app_lookup.values():
        has_created = conn.execute(sa.text("""
            SELECT 1 FROM events
            WHERE application_id = :app_id AND type = 'application_created'
            LIMIT 1
        """), {"app_id": app_id}).fetchone()
        if has_created:
            continue
        earliest = conn.execute(sa.text("""
            SELECT MIN(occurred_at) FROM events WHERE application_id = :app_id
        """), {"app_id": app_id}).scalar()
        app_created_at = conn.execute(sa.text("""
            SELECT created_at FROM applications WHERE id = :app_id
        """), {"app_id": app_id}).scalar()
        event_time = earliest or app_created_at or now

        conn.execute(sa.text("""
            INSERT INTO events (application_id, type, occurred_at, actor_type, payload, body, created_at, updated_at)
            VALUES (:app_id, 'application_created', :occurred_at, 'system', NULL, NULL, :now, :now)
        """), {
            "app_id": app_id,
            "occurred_at": event_time,
            "now": now,
        })

    # stage derive via shared engine function (spec requirement)
    session = Session(bind=conn)
    try:
        apps = session.query(Application).all()
        for app in apps:
            session.expire(app, ["events"])
            app.stage = derive(app)
        session.flush()
    finally:
        session.close()
