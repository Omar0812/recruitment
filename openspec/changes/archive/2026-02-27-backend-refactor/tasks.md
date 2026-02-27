## 1. Alembic Migration 清理

- [x] 1.1 新建 Alembic migration 文件 `batch2_server_cleanup`，将 server.py 中所有 `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` 补丁转为幂等的 `op.execute()` 语句（用 `IF NOT EXISTS` 或 `try-except`）
- [x] 1.2 在新 migration 中覆盖 server.py 补丁中的所有内容：jobs 列（type/priority/city/job_category/employment_type）、candidate_job_links 列（rejection_reason）、candidates 列（followup_status/merged_into/deleted_at）、activity_records 表创建、interview_records → activity_records 数据迁移、suppliers 表创建、candidates.supplier_id 列
- [x] 1.3 验证：在现有数据库上运行 `alembic upgrade head` 不报错
- [x] 1.4 清空 `app/server.py` 中所有 migration 补丁代码（`# ALTER TABLE patch` 到 `app = FastAPI(...)` 之间的全部内容），保留 FastAPI app 初始化、路由注册、静态文件挂载
- [x] 1.5 验证 server.py 行数 ≤ 60 行，重启服务正常

## 2. Pydantic Schemas

- [x] 2.1 新建 `app/schemas.py`，定义 `CandidateOut` model
- [x] 2.2 在 `app/schemas.py` 定义 `LinkOut` model
- [x] 2.3 在 `app/schemas.py` 定义 `ActivityOut` model，实现 payload 优先读逻辑
- [x] 2.4 逐字段验证 `CandidateOut.model_validate(candidate_obj)` 的输出与 `candidate_to_dict(candidate_obj)` 完全一致（用现有数据库中的测试记录手动对比）
- [x] 2.5 逐字段验证 `ActivityOut.model_validate(record_obj)` 与 `record_to_dict(record_obj)` 完全一致（包含 payload 有值和 payload 为 None 两种情况）

## 3. Service 层

- [x] 3.1 新建 `app/services/__init__.py`（空文件）
- [x] 3.2 新建 `app/services/activities.py`，迁移 `derive_stage()`、`_sync_stage()`、`_build_payload()`、`_get()` 函数，以及 `CHAIN_TYPES`、`_RETIRED_CHAIN_TYPES`、`STAGE_LABEL` 常量
- [x] 3.3 新建 `app/services/pipeline.py`，提取以下业务函数：`link_candidate(db, candidate_id, job_id) -> CandidateJobLink`（含黑名单检查、单流程约束、创建 link + 初始 ActivityRecord + HistoryEntry）、`resolve_outcome(db, lnk, outcome, rejection_reason) -> CandidateJobLink`、`hire_candidate(db, lnk) -> CandidateJobLink`、`transfer_job(db, lnk, new_job_id) -> CandidateJobLink`
- [x] 3.4 新建 `app/services/candidates.py`，提取候选人黑名单操作逻辑（`blacklist_candidate`、`unblacklist_candidate`）

## 4. Route Handler 更新

- [x] 4.1 更新 `app/routes/activities.py`：从 `app.services.activities` 导入 `derive_stage`、`_sync_stage`、`_build_payload`、`_get` 及常量；用 `ActivityOut.model_validate(record)` 替换所有 `record_to_dict(record)` 调用；删除 route 文件中的这些函数定义
- [x] 4.2 更新 `app/routes/pipeline.py`：从 `app.services.pipeline` 导入 service 函数；route handler 调用 service 函数而非直接操作 db；用 `LinkOut.model_validate(lnk)` 替换所有 `link_to_dict(lnk)` 调用；删除 route 文件中的 `link_to_dict` 定义
- [x] 4.3 更新 `app/routes/candidates.py`：用 `CandidateOut.model_validate(c)` 替换所有 `candidate_to_dict(c)` 调用；从 `app.services.candidates` 导入黑名单逻辑；删除 route 文件中的 `candidate_to_dict` 定义
- [x] 4.4 检查其他 route 文件（jobs.py、suppliers.py、dashboard.py、insights.py）是否有内联序列化逻辑，如有则同步迁移

## 5. 端到端验证

- [x] 5.1 启动服务（`python3 main.py`），确认无报错
- [x] 5.2 验证 `GET /api/candidates` 返回完整字段（含 supplier_name、display_id 等 computed 字段）
- [x] 5.3 验证 `GET /api/pipeline/active` 返回完整字段（含 days_since_update）
- [x] 5.4 验证 `GET /api/activities?link_id=X` 返回完整字段（含 payload 优先读的 round、score 等）
- [x] 5.5 验证创建候选人 → 加入流程 → 添加面试记录 → 入职 完整流程正常
- [ ] 5.6 验证现有前端页面（Today、Pipeline、Talent、Hired）无 JS 报错、数据显示正常
