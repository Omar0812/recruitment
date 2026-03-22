"""多附件 API 测试：追加/删除/详情返回。"""
import pytest
from app.models.legacy import Candidate


class TestAttachmentAPI:
    """POST/DELETE /candidates/{id}/attachments"""

    def test_add_attachment(self, client, db):
        c = Candidate(name="附件测试")
        db.add(c)
        db.flush()

        resp = client.post(f"/api/v1/candidates/{c.id}/attachments", json={
            "file_path": "data/resumes/abc.pdf",
            "label": "简历",
            "type": "resume",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["attachments"]) == 1
        assert data["attachments"][0]["file_path"] == "data/resumes/abc.pdf"
        assert data["attachments"][0]["label"] == "简历"
        assert data["attachments"][0]["type"] == "resume"

    def test_add_multiple_attachments(self, client, db):
        c = Candidate(name="多附件测试")
        db.add(c)
        db.flush()

        client.post(f"/api/v1/candidates/{c.id}/attachments", json={
            "file_path": "data/resumes/resume.pdf",
            "label": "简历",
            "type": "resume",
        })
        resp = client.post(f"/api/v1/candidates/{c.id}/attachments", json={
            "file_path": "data/resumes/portfolio.pdf",
            "label": "作品集",
            "type": "attachment",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["attachments"]) == 2

    def test_remove_attachment(self, client, db):
        c = Candidate(name="删除附件测试", attachments=[
            {"file_path": "data/resumes/a.pdf", "label": "简历", "type": "resume", "created_at": "2026-01-01"},
            {"file_path": "data/resumes/b.pdf", "label": "作品集", "type": "attachment", "created_at": "2026-01-02"},
        ])
        db.add(c)
        db.flush()

        resp = client.request("DELETE", f"/api/v1/candidates/{c.id}/attachments", json={
            "file_path": "data/resumes/a.pdf",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["attachments"]) == 1
        assert data["attachments"][0]["file_path"] == "data/resumes/b.pdf"

    def test_remove_nonexistent_attachment(self, client, db):
        c = Candidate(name="删除不存在附件", attachments=[
            {"file_path": "data/resumes/a.pdf", "label": "简历", "type": "resume", "created_at": "2026-01-01"},
        ])
        db.add(c)
        db.flush()

        resp = client.request("DELETE", f"/api/v1/candidates/{c.id}/attachments", json={
            "file_path": "data/resumes/not-exist.pdf",
        })
        assert resp.status_code == 200
        assert len(resp.json()["attachments"]) == 1

    def test_detail_returns_attachments(self, client, db):
        c = Candidate(name="详情附件测试", attachments=[
            {"file_path": "data/resumes/resume.pdf", "label": "简历", "type": "resume", "created_at": "2026-01-01"},
        ])
        db.add(c)
        db.flush()

        resp = client.get(f"/api/v1/candidates/{c.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "attachments" in data
        assert len(data["attachments"]) == 1

    def test_create_candidate_syncs_resume_to_attachments(self, client, db):
        resp = client.post("/api/v1/candidates", json={
            "name": "同步测试",
            "resume_path": "data/resumes/sync.pdf",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["attachments"]) == 1
        assert data["attachments"][0]["file_path"] == "data/resumes/sync.pdf"
        assert data["attachments"][0]["type"] == "resume"

    def test_add_attachment_404(self, client):
        resp = client.post("/api/v1/candidates/99999/attachments", json={
            "file_path": "data/resumes/x.pdf",
        })
        assert resp.status_code == 404
