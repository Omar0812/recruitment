"""核心招聘流程集成测试：注册 → 创建岗位/候选人 → Application → 全链路推进 → 入职。

所有写操作走 POST /api/v1/actions/execute（动作引擎），
读操作走对应资源接口，验证真实 HTTP 端点行为。
"""
import uuid

import pytest


def _uid() -> str:
    return str(uuid.uuid4())


class TestFullRecruitmentFlow:
    """模块级状态共享：按顺序执行完整流程。"""

    # 共享状态
    _token: str = ""
    _user_id: int = 0
    _job_id: int = 0
    _candidate_id: int = 0
    _application_id: int = 0

    # ── 1. 注册 & 登录 ──

    def test_register(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "login_name": "integrationuser",
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["login_name"] == "integrationuser"
        assert data["user"]["is_admin"] is True  # 首个用户自动 admin
        TestFullRecruitmentFlow._token = data["token"]
        TestFullRecruitmentFlow._user_id = data["user"]["id"]

    def test_login(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "login_name": "integrationuser",
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        # 用新 token
        TestFullRecruitmentFlow._token = data["token"]

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self._token}"}

    # ── 2. 创建岗位 ──

    def test_create_job(self, client):
        resp = client.post("/api/v1/jobs", json={
            "title": "高级后端工程师",
            "department": "技术部",
            "location_name": "北京",
            "headcount": 2,
            "jd": "负责后端系统架构设计与开发",
        }, headers=self.headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "高级后端工程师"
        assert data["status"] == "open"
        TestFullRecruitmentFlow._job_id = data["id"]

    # ── 3. 创建候选人 ──

    def test_create_candidate(self, client):
        resp = client.post("/api/v1/candidates", json={
            "name": "李明",
            "phone": "13800138000",
            "email": "liming@example.com",
            "source": "直投",
        }, headers=self.headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "李明"
        assert data["phone"] == "13800138000"
        TestFullRecruitmentFlow._candidate_id = data["id"]

    # ── 4. 创建 Application（推荐到岗位）──

    def test_create_application(self, client):
        resp = client.post("/api/v1/actions/execute", json={
            "command_id": _uid(),
            "action_code": "create_application",
            "target": {"type": "candidate", "id": self._candidate_id},
            "payload": {"job_id": self._job_id},
        }, headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["action_code"] == "create_application"
        TestFullRecruitmentFlow._application_id = data["target_id"]

        # 验证 Application 状态
        resp2 = client.get(
            f"/api/v1/applications/{self._application_id}",
            headers=self.headers,
        )
        assert resp2.status_code == 200
        app_data = resp2.json()
        assert app_data["state"] == "IN_PROGRESS"
        assert app_data["stage"] == "新申请"

    # ── 5. 全链路阶段推进 ──

    def _execute_action(self, client, action_code, payload=None):
        resp = client.post("/api/v1/actions/execute", json={
            "command_id": _uid(),
            "action_code": action_code,
            "target": {"type": "application", "id": self._application_id},
            "payload": payload or {},
        }, headers=self.headers)
        assert resp.status_code == 200, f"{action_code} 失败: {resp.text}"
        data = resp.json()
        assert data["ok"] is True, f"{action_code} 返回 ok=false: {data}"
        return data

    def test_assign_screening(self, client):
        data = self._execute_action(client, "assign_screening", {
            "screener": "测试筛选人",
        })
        assert data["stage_after"] == "简历筛选"

    def test_pass_screening(self, client):
        data = self._execute_action(client, "pass_screening")
        assert data["stage_after"] == "面试"

    def test_schedule_interview(self, client):
        data = self._execute_action(client, "schedule_interview", {
            "interview_time": "2026-04-01T10:00:00Z",
            "location": "线上",
            "interviewer": "张经理",
        })
        # schedule_interview 是阶段内记录，stage 不变
        assert data["stage_after"] == "面试"

    def test_record_interview_feedback(self, client):
        data = self._execute_action(client, "record_interview_feedback", {
            "conclusion": "pass",
            "summary": "候选人技术能力优秀",
        })
        assert data["stage_after"] == "面试"

    def test_advance_to_offer(self, client):
        data = self._execute_action(client, "advance_to_offer")
        assert data["stage_after"] == "Offer沟通"

    def test_start_background_check(self, client):
        data = self._execute_action(client, "start_background_check")
        assert data["stage_after"] == "背调"

    def test_record_background_check_result(self, client):
        data = self._execute_action(client, "record_background_check_result", {
            "result": "pass",
            "summary": "背调通过",
        })
        assert data["stage_after"] == "背调"

    def test_record_offer(self, client):
        data = self._execute_action(client, "record_offer", {
            "monthly_salary": 30000,
            "salary_months": 13,
        })
        assert data["stage_after"] == "待入职"

    def test_confirm_hire(self, client):
        data = self._execute_action(client, "confirm_hire", {
            "onboard_date": "2026-04-15",
        })
        assert data["state_after"] == "HIRED"
        assert data["stage_after"] == "已入职"

    # ── 6. 验证最终状态 ──

    def test_final_application_state(self, client):
        resp = client.get(
            f"/api/v1/applications/{self._application_id}",
            headers=self.headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["state"] == "HIRED"
        assert data["stage"] == "已入职"

    # ── 7. 事件时间线完整性 ──

    def test_event_timeline_integrity(self, client):
        resp = client.get(
            f"/api/v1/events?application_id={self._application_id}",
            headers=self.headers,
        )
        assert resp.status_code == 200
        events = resp.json()

        # 至少包含：application_created + screening_assigned + 6 个推进类 + 若干记录类
        assert len(events) >= 8, f"事件数量不足: {len(events)}"

        # 验证 actor_id 一致
        for ev in events:
            assert ev["actor_id"] == self._user_id, (
                f"事件 {ev['type']} 的 actor_id 不一致: "
                f"期望 {self._user_id}, 实际 {ev['actor_id']}"
            )

        # 验证包含关键事件类型
        event_types = {ev["type"] for ev in events}
        expected_types = {
            "application_created",
            "screening_assigned",
            "screening_passed",
            "interview_scheduled",
            "advance_to_offer",
            "start_background_check",
            "hire_confirmed",
        }
        missing = expected_types - event_types
        assert not missing, f"缺少事件类型: {missing}"
