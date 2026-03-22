from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base
from app.migration.wave1_backfill import run_wave1_backfill
from app.models.application import Application
from app.models.audit_log import AuditLog
from app.models.event import Event
from app.models.legacy import Candidate, Job


def _create_legacy_tables(conn):
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS candidate_job_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id),
            job_id INTEGER NOT NULL REFERENCES jobs(id),
            stage VARCHAR,
            notes TEXT,
            outcome VARCHAR,
            state VARCHAR,
            rejection_reason VARCHAR,
            close_reason_code VARCHAR,
            close_note TEXT,
            template_version_id INTEGER,
            created_at DATETIME,
            updated_at DATETIME
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS activity_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link_id INTEGER NOT NULL REFERENCES candidate_job_links(id),
            type VARCHAR NOT NULL,
            stage VARCHAR,
            created_at DATETIME,
            actor VARCHAR,
            comment TEXT,
            conclusion VARCHAR,
            rejection_reason VARCHAR,
            round VARCHAR,
            interview_time VARCHAR,
            scheduled_at DATETIME,
            location VARCHAR,
            status VARCHAR,
            score INTEGER,
            salary VARCHAR,
            start_date VARCHAR,
            from_stage VARCHAR,
            to_stage VARCHAR,
            embedding_text TEXT,
            payload JSON
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS history_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id),
            job_id INTEGER REFERENCES jobs(id),
            event_type VARCHAR,
            detail TEXT,
            timestamp DATETIME
        )
    """))
    conn.commit()


@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:")

    @event.listens_for(eng, "connect")
    def _fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    with eng.connect() as conn:
        _create_legacy_tables(conn)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    conn = engine.connect()
    txn = conn.begin()
    session = Session(bind=conn)
    yield session
    session.close()
    txn.rollback()
    conn.close()


def _seed_basic_legacy_data(db: Session):
    c = Candidate(name="候选人A")
    j = Job(title="Engineer")
    db.add_all([c, j])
    db.flush()
    cand_id, job_id = c.id, j.id

    conn = db.connection()
    now = datetime.utcnow()
    conn.execute(text("""
        INSERT INTO candidate_job_links (candidate_id, job_id, state, stage, created_at, updated_at)
        VALUES (:cid, :jid, 'IN_PROGRESS', '面试', :ca, :ua)
    """), {
        "cid": cand_id,
        "jid": job_id,
        "ca": (now - timedelta(days=2)).isoformat(),
        "ua": (now - timedelta(days=1)).isoformat(),
    })
    link_id = conn.execute(text("SELECT last_insert_rowid()")).scalar()

    conn.execute(text("""
        INSERT INTO activity_records (link_id, type, status, actor, round, comment, created_at)
        VALUES (:lid, 'interview', 'scheduled', '面试官张三', '一面', '已安排', :ca)
    """), {
        "lid": link_id,
        "ca": (now - timedelta(days=1)).isoformat(),
    })

    conn.execute(text("""
        INSERT INTO history_entries (candidate_id, job_id, event_type, detail, timestamp)
        VALUES (:cid, :jid, 'note', '历史备注', :ts)
    """), {
        "cid": cand_id,
        "jid": job_id,
        "ts": now.isoformat(),
    })

    db.flush()
    return cand_id, job_id


class TestWave1Backfill:
    def test_first_run_backfill_success(self, db: Session):
        cand_id, job_id = _seed_basic_legacy_data(db)

        run_wave1_backfill(db.connection())
        db.flush()

        app = db.query(Application).filter_by(candidate_id=cand_id, job_id=job_id).first()
        assert app is not None
        assert app.state == "IN_PROGRESS"
        assert app.stage is not None

        events = db.query(Event).filter_by(application_id=app.id).all()
        assert len(events) >= 2
        event_types = {e.type for e in events}
        assert "application_created" in event_types

    def test_idempotent_rerun(self, db: Session):
        _seed_basic_legacy_data(db)

        run_wave1_backfill(db.connection())
        db.flush()
        app_count_1 = db.query(Application).count()
        event_count_1 = db.query(Event).count()

        run_wave1_backfill(db.connection())
        db.flush()
        app_count_2 = db.query(Application).count()
        event_count_2 = db.query(Event).count()

        assert app_count_1 == app_count_2
        assert event_count_1 == event_count_2

    def test_duplicate_active_conflict_fix(self, db: Session):
        c = Candidate(name="候选人B")
        j1 = Job(title="Backend")
        j2 = Job(title="Frontend")
        db.add_all([c, j1, j2])
        db.flush()

        conn = db.connection()
        now = datetime.utcnow()
        conn.execute(text("""
            INSERT INTO candidate_job_links (candidate_id, job_id, state, created_at, updated_at)
            VALUES (:cid, :jid, 'IN_PROGRESS', :ca, :ua)
        """), {
            "cid": c.id,
            "jid": j1.id,
            "ca": (now - timedelta(days=3)).isoformat(),
            "ua": (now - timedelta(days=3)).isoformat(),
        })
        conn.execute(text("""
            INSERT INTO candidate_job_links (candidate_id, job_id, state, created_at, updated_at)
            VALUES (:cid, :jid, 'IN_PROGRESS', :ca, :ua)
        """), {
            "cid": c.id,
            "jid": j2.id,
            "ca": (now - timedelta(days=1)).isoformat(),
            "ua": (now - timedelta(days=1)).isoformat(),
        })
        db.flush()

        run_wave1_backfill(db.connection())
        db.flush()

        links = conn.execute(text(
            "SELECT state FROM candidate_job_links WHERE candidate_id = :cid ORDER BY state"
        ), {"cid": c.id}).fetchall()
        states = sorted([r[0] for r in links])
        assert states == ["IN_PROGRESS", "WITHDRAWN"]

        dedup_logs = db.query(AuditLog).filter_by(action_code="migration_dedup").all()
        assert len(dedup_logs) >= 1
