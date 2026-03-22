"""集成测试共享 fixture。

使用 FastAPI TestClient + in-memory SQLite，通过真实 HTTP 端点验证。
"""
import os
import sys
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import Base, get_db
from app.entry.api import router, install_error_handlers


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


@pytest.fixture(scope="module")
def client(test_engine, _session_factory):
    """模块级 TestClient，不 mock current_user — 测试通过真实注册/登录获取 token。"""
    test_app = FastAPI()
    test_app.include_router(router)
    install_error_handlers(test_app)

    def _override_db():
        session = _session_factory()
        try:
            yield session
        finally:
            session.close()

    test_app.dependency_overrides[get_db] = _override_db
    return TestClient(test_app)


@pytest.fixture(scope="module")
def auth_headers(client):
    """注册 + 登录，返回认证 header。"""
    # 注册
    resp = client.post("/api/v1/auth/register", json={
        "login_name": "testadmin",
        "password": "test123456",
    })
    assert resp.status_code == 200, f"注册失败: {resp.text}"
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}
