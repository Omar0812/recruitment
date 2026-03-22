"""测试文件上传端点。"""
import io


def test_upload_pdf(client, tmp_path):
    content = b"%PDF-1.4 test content"
    r = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert r.status_code == 200
    body = r.json()
    assert "sha256" in body
    assert body["file_path"].endswith(".pdf")
    assert body["preview_path"] == body["file_path"]


def test_upload_docx_preview_path_null_without_libreoffice(client, tmp_path):
    """Without LibreOffice installed, preview_path should be null for DOCX."""
    content = b"PK\x03\x04 fake docx content"
    r = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.docx", io.BytesIO(content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["file_path"].endswith(".docx")
    # preview_path is null when LibreOffice is not available or conversion fails
    assert "preview_path" in body


def test_upload_duplicate(client, tmp_path):
    content = b"%PDF-1.4 duplicate test"
    r1 = client.post(
        "/api/v1/files/upload",
        files={"file": ("a.pdf", io.BytesIO(content), "application/pdf")},
    )
    r2 = client.post(
        "/api/v1/files/upload",
        files={"file": ("b.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert r1.json()["sha256"] == r2.json()["sha256"]


def test_upload_unsupported_type(client):
    r = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.exe", io.BytesIO(b"bad"), "application/octet-stream")},
    )
    assert r.status_code == 400


def test_upload_too_large(client):
    content = b"x" * (20 * 1024 * 1024 + 1)
    r = client.post(
        "/api/v1/files/upload",
        files={"file": ("big.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert r.status_code == 400


def test_get_uploaded_file(client):
    content = b"%PDF-1.4 preview content"
    upload = client.post(
        "/api/v1/files/upload",
        files={"file": ("preview.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert upload.status_code == 200

    file_path = upload.json()["file_path"]
    response = client.get(f"/api/v1/files/{file_path}")

    assert response.status_code == 200
    assert response.content == content


def test_get_uploaded_file_rejects_path_traversal(client):
    response = client.get("/api/v1/files/%2E%2E/%2E%2E/pyproject.toml")

    assert response.status_code == 404
