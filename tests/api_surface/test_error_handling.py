"""测试 /api/v1 统一错误响应格式。"""
import uuid


def _uid() -> str:
    return str(uuid.uuid4())


def test_business_error_returns_code_and_message(client, seed):
    app = seed["application"]

    response = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "confirm_hire",
        "target": {"type": "application", "id": app.id},
        "payload": {},
        "actor": {"type": "human"},
    })

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "stage_prerequisite_missing"
    assert "需要先完成" in body["message"]


def test_http_exception_returns_code_and_message(client):
    response = client.post("/api/v1/actions/execute", json={
        "command_id": _uid(),
        "action_code": "add_note",
        "target": {"type": "application", "id": 99999},
        "payload": {},
        "actor": {"type": "human"},
    })

    assert response.status_code == 404
    assert response.json() == {
        "code": "http_404",
        "message": "Application not found",
    }


def test_validation_error_returns_code_and_message(client):
    response = client.post("/api/v1/actions/execute", json={
        "action_code": "add_note",
        "target": {"type": "application", "id": 1},
        "payload": {},
        "actor": {"type": "human"},
    })

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert "command_id" in body["message"]
