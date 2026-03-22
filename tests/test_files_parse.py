"""Tests for POST /files/parse endpoint."""
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.server import app
from app.entry.deps import current_user


class _FakeUser:
    id = 1
    login_name = "testuser"
    display_name = "Test User"
    is_admin = True
    is_setup_complete = True
    deleted_at = None


app.dependency_overrides[current_user] = lambda: _FakeUser()
client = TestClient(app)

UPLOAD_DIR = Path("data/resumes")


@pytest.fixture(autouse=True)
def _ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _create_fake_resume(name: str = "test_parse_dummy.pdf") -> str:
    """Create a dummy file in the real upload dir, cleaned up after test."""
    p = UPLOAD_DIR / name
    p.write_text("fake resume content")
    yield str(p)
    p.unlink(missing_ok=True)


@pytest.fixture
def fake_resume():
    p = UPLOAD_DIR / "test_parse_dummy.pdf"
    p.write_text("fake resume content")
    yield str(p)
    p.unlink(missing_ok=True)


class TestParseEndpoint:
    def test_parse_success(self, fake_resume):
        mock_parsed = {
            "name": "张三",
            "phone": "13800138000",
            "email": "zhang@example.com",
            "education_list": [{"school": "北京大学", "degree": "本科", "period": "2015-2019"}],
        }

        with patch("app.extractor.extract_text", return_value="简历文本内容"), \
             patch("app.ai_client.parse_resume", return_value=mock_parsed):
            resp = client.post("/api/v1/files/parse", json={"file_path": fake_resume})

        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "张三"
        assert data["phone"] == "13800138000"
        assert len(data["education_list"]) == 1

    def test_parse_file_not_found(self):
        resp = client.post("/api/v1/files/parse", json={"file_path": "nonexistent.pdf"})
        assert resp.status_code == 404

    def test_parse_ai_not_configured(self, fake_resume):
        with patch("app.extractor.extract_text", return_value="简历文本"), \
             patch("app.ai_client.parse_resume", return_value={}):
            resp = client.post("/api/v1/files/parse", json={"file_path": fake_resume})

        assert resp.status_code == 200
        assert resp.json() == {}

    def test_parse_ai_exception(self, fake_resume):
        with patch("app.extractor.extract_text", return_value="简历文本"), \
             patch("app.ai_client.parse_resume", side_effect=RuntimeError("API error")):
            resp = client.post("/api/v1/files/parse", json={"file_path": fake_resume})

        assert resp.status_code == 200
        assert resp.json() == {}

    def test_parse_extraction_failed(self, fake_resume):
        with patch("app.extractor.extract_text", return_value="[PDF提取失败: error]"):
            resp = client.post("/api/v1/files/parse", json={"file_path": fake_resume})

        assert resp.status_code == 200
        assert resp.json() == {}
