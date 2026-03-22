"""api-surface 测试共享 fixture。

使用 FastAPI TestClient + 内存 SQLite。
"""
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base, get_db
from app.engine.executor import execute
from app.models.application import Application
from app.models.enums import ActorType, ApplicationState
from app.models.event import Event
from app.models.legacy import Candidate, Job
from app.models.term import Term
from app.models.expense import Expense


def _uid() -> str:
    return str(uuid.uuid4())


@pytest.fixture(scope="module")
def test_engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(eng, "connect")
    def _fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture(scope="module")
def _session_factory(test_engine):
    return sessionmaker(bind=test_engine)


@pytest.fixture()
def db(_session_factory):
    session = _session_factory()
    yield session
    session.rollback()
    session.close()


@pytest.fixture()
def client(db):
    from app.entry.api import router, install_error_handlers
    from app.entry.deps import current_user
    from app.models.user import User
    from fastapi import FastAPI

    # 创建或复用测试用户
    test_user = db.query(User).filter(User.login_name == "testuser").first()
    if test_user is None:
        test_user = User(
            login_name="testuser",
            password_hash="fakehash",
            display_name="Test User",
            is_admin=True,
            is_setup_complete=True,
        )
        db.add(test_user)
        db.flush()

    test_app = FastAPI()
    test_app.include_router(router)
    install_error_handlers(test_app)

    def _override_db():
        yield db

    def _override_user():
        return test_user

    test_app.dependency_overrides[get_db] = _override_db
    test_app.dependency_overrides[current_user] = _override_user
    return TestClient(test_app)


@pytest.fixture()
def seed(db: Session):
    c = Candidate(name="张三")
    j = Job(title="Engineer")
    db.add_all([c, j])
    db.flush()

    a = Application(
        candidate_id=c.id,
        job_id=j.id,
        state=ApplicationState.IN_PROGRESS.value,
    )
    db.add(a)
    db.flush()

    # create_application event
    execute(
        db,
        action_code="create_application",
        application=a,
        payload={},
        actor_type=ActorType.HUMAN.value,
        command_id=_uid(),
    )

    return {
        "candidate": c,
        "job": j,
        "application": a,
        "uid": _uid,
    }
