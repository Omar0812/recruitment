"""event-engine 测试共享 fixture。

与 schema_foundation 测试保持一致的组织方式：
内存 SQLite + Base.metadata.create_all + module scope session。
"""
import os
import sys
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base
from app.models.application import Application
from app.models.enums import ApplicationState
from app.models.legacy import Candidate, Job


@pytest.fixture(scope="module")
def db_session():
    """创建内存 SQLite，建全表，返回 session。"""
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def seed(db_session: Session):
    """每个测试拿到 1 Candidate + 1 Job + 1 IN_PROGRESS Application。

    function scope —— 每个测试独立数据，互不干扰。
    """
    c = Candidate(name="张三")
    j = Job(title="Engineer")
    db_session.add_all([c, j])
    db_session.flush()

    app = Application(
        candidate_id=c.id,
        job_id=j.id,
        state=ApplicationState.IN_PROGRESS.value,
    )
    db_session.add(app)
    db_session.flush()

    yield {
        "candidate_id": c.id,
        "job_id": j.id,
        "application": app,
    }

    # teardown：回滚到 test 之前的状态
    db_session.rollback()
