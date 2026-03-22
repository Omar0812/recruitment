"""audit-trail 测试共享 fixture。

与 event_engine 测试保持一致的组织方式：
内存 SQLite + Base.metadata.create_all + 每测试独立事务回滚。
"""
import os
import sys
import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base
from app.engine.executor import execute
from app.models.application import Application
from app.models.enums import ActorType, ApplicationState, EventType
from app.models.legacy import Candidate, Job


def _uid() -> str:
    return str(uuid.uuid4())


@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:")

    @event.listens_for(eng, "connect")
    def _fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    """每个测试独立 session + 尾部 rollback。"""
    conn = engine.connect()
    txn = conn.begin()
    session = Session(bind=conn)
    yield session
    session.close()
    txn.rollback()
    conn.close()


@pytest.fixture()
def app_with_events(db: Session) -> dict:
    """1 Candidate + 1 Job + 1 Application(IN_PROGRESS) + create + screening。

    返回 dict 含 application 和快捷 uid 函数。
    """
    c = Candidate(name="王五")
    j = Job(title="Frontend")
    db.add_all([c, j])
    db.flush()

    a = Application(
        candidate_id=c.id,
        job_id=j.id,
        state=ApplicationState.IN_PROGRESS.value,
    )
    db.add(a)
    db.flush()

    # 建基础事件链：create + screening_passed
    execute(
        db, action_code="create_application", application=a,
        payload={}, actor_type=ActorType.HUMAN.value, command_id=_uid(),
    )
    execute(
        db, action_code="pass_screening", application=a,
        payload={}, actor_type=ActorType.HUMAN.value, command_id=_uid(),
    )
    return {"application": a, "uid": _uid}


@pytest.fixture()
def app_in_progress(db: Session) -> Application:
    """1 Candidate + 1 Job + 1 Application(IN_PROGRESS)，不带事件。"""
    c = Candidate(name="赵六")
    j = Job(title="Backend")
    db.add_all([c, j])
    db.flush()
    a = Application(
        candidate_id=c.id,
        job_id=j.id,
        state=ApplicationState.IN_PROGRESS.value,
    )
    db.add(a)
    db.flush()
    return a
