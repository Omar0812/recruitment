"""
schema-foundation C1: 枚举 CheckConstraint 负向测试
验证非法值写入 applications.state / events.type / events.actor_type / terms.type 时，
数据库抛出 IntegrityError。
"""
import os
import sys
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

# 确保项目根在 sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base
from app.models.legacy import Candidate, Job
from app.models.application import Application
from app.models.event import Event
from app.models.term import Term


@pytest.fixture(scope="module")
def db_session():
    """创建内存 SQLite，跑完整 metadata 建表，返回 session。"""
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture(scope="module")
def seed(db_session: Session):
    """插入最小依赖数据：1 Candidate + 1 Job。"""
    c = Candidate(name="Test")
    j = Job(title="Engineer")
    db_session.add_all([c, j])
    db_session.commit()
    return {"candidate_id": c.id, "job_id": j.id}


def test_application_state_rejects_invalid(db_session: Session, seed):
    """applications.state 非法值应触发 IntegrityError。"""
    app = Application(
        candidate_id=seed["candidate_id"],
        job_id=seed["job_id"],
        state="BOGUS",
    )
    db_session.add(app)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_event_type_rejects_invalid(db_session: Session, seed):
    """events.type 非法值应触发 IntegrityError。"""
    # 先创建一个合法 Application
    app = Application(
        candidate_id=seed["candidate_id"],
        job_id=seed["job_id"],
        state="IN_PROGRESS",
    )
    db_session.add(app)
    db_session.flush()

    ev = Event(
        application_id=app.id,
        type="INVALID_EVENT",
        occurred_at=datetime.now(timezone.utc),
        actor_type="human",
    )
    db_session.add(ev)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_event_actor_type_rejects_invalid(db_session: Session, seed):
    """events.actor_type 非法值应触发 IntegrityError。"""
    app = Application(
        candidate_id=seed["candidate_id"],
        job_id=seed["job_id"],
        state="IN_PROGRESS",
    )
    db_session.add(app)
    db_session.flush()

    ev = Event(
        application_id=app.id,
        type="note",
        occurred_at=datetime.now(timezone.utc),
        actor_type="INVALID_ACTOR",
    )
    db_session.add(ev)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_term_type_rejects_invalid(db_session: Session):
    """terms.type 非法值应触发 IntegrityError。"""
    t = Term(type="INVALID", name="Test")
    db_session.add(t)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()
