## Context

后端当前状态：
- `app/server.py` 171 行，其中 ~120 行是原始 `ALTER TABLE` SQL 补丁，在每次服务器启动时执行
- Alembic 已引入（3 个 migration 文件），但 server.py 的补丁从未清理
- 3 个手写序列化函数（`candidate_to_dict` 39 行、`link_to_dict` 15 行、`record_to_dict` 29 行），字段变更需同步 3 处
- 所有业务逻辑（黑名单检查、状态机、链尾约束等）直接写在 route handler 里，无法在不同 route 间复用
- `ActivityRecord` 保留 15 个稀疏列（`round`、`score`、`scheduled_at` 等）同时拥有 `payload JSON`，`record_to_dict` 中双读逻辑复杂

约束：
- 所有 API endpoint 路径和 response 字段结构必须完全兼容，前端零改动
- 不引入新依赖（pydantic 已在 fastapi 依赖链中）
- SQLite 继续使用，不切换数据库

## Goals / Non-Goals

**Goals:**
- `server.py` 清理为 < 50 行，migration 补丁全部转为 Alembic migration 文件
- 新增 `app/services/` 目录，将 pipeline / candidate / activity 核心业务规则从 route handler 中提取
- 引入 `app/schemas.py`，用 Pydantic response model 替代手写 `_to_dict()`，字段变更只改一处
- 前端 API 兼容性 100%，行为不变

**Non-Goals:**
- 不切换为 async SQLAlchemy（成本高，收益有限，可单独 batch 做）
- 不删除 ActivityRecord 稀疏列（数据迁移风险，保留双读逻辑）
- 不重写 AI 层（extractor.py / ai_client.py）
- 不改变 Alembic 现有 3 个 migration 的内容

## Decisions

### D1：新增 Alembic migration 覆盖 server.py 补丁，而非修改现有 migration

**选择**：新建第 4 个 migration 文件，标记现有补丁为"已覆盖"，然后清空 server.py 中的补丁代码。

**理由**：现有 3 个 migration 已在生产数据库上执行过。server.py 中的补丁大多是早于 Alembic 引入时的遗留，实际上已执行成功（ALTER TABLE 失败被 `except: pass` 静默）。新 migration 只需做幂等的"确认列存在"检查，不重复执行已有操作。

**替代方案**：修改 server.py 只在 db 为空时执行——被否决，因为仍是补丁思维，不解决根本问题。

### D2：service 层只抽核心业务规则，不重写 route handler

**选择**：新建 `app/services/pipeline.py`、`app/services/candidates.py`、`app/services/activities.py`，将可复用的业务函数（如 `link_candidate()`、`resolve_outcome()`、`derive_stage()`）迁移进去。route handler 保持轻薄：做参数解析、调用 service、返回 response。

**理由**：全量重写 route handler 风险高（容易引入行为差异）。只抽"被多处调用或将来会被多处调用"的逻辑，低风险高收益。

**替代方案**：引入 Repository 模式（数据访问层）——被否决，过度设计，当前规模不需要。

### D3：Pydantic response schema 用 `model_validate` + `from_attributes=True`

**选择**：在 `app/schemas.py` 定义 `CandidateOut`、`LinkOut`、`ActivityOut` 等 response model，使用 `model_config = ConfigDict(from_attributes=True)` 允许从 ORM 对象直接实例化。route handler 返回 `CandidateOut.model_validate(obj)` 而非 `candidate_to_dict(obj)`。

**理由**：Pydantic v2 的 `from_attributes` 模式完全兼容 SQLAlchemy ORM 对象。字段新增只改 schema 一处，FastAPI 自动从 schema 生成 OpenAPI 文档（现在没有文档）。

**注意**：`ActivityOut` 需要保留 payload 优先读逻辑（用 `@computed_field` 或 `model_validator`），因为稀疏列和 payload 并存。

### D4：service 函数签名传入 `db: Session`，不引入全局状态

**选择**：service 函数签名为 `def link_candidate(db: Session, candidate_id: int, job_id: int) -> CandidateJobLink`，由 route handler 传入 db session。

**理由**：保持与现有 FastAPI `Depends(get_db)` 模式一致，不需要额外的依赖注入框架。

## Risks / Trade-offs

- **[Risk] server.py 补丁清理后，旧版本数据库启动失败** → Mitigation：新 Alembic migration 用 `IF NOT EXISTS` / `try-except` 确保幂等，与之前补丁行为一致
- **[Risk] Pydantic schema 漏掉某个字段导致前端静默丢数据** → Mitigation：task 中有专项检查步骤，逐字段对比 `_to_dict()` 输出与 schema 输出
- **[Risk] service 层抽取时遗漏某处调用，导致行为不一致** → Mitigation：每个 service 函数迁移后立即删除原始 route handler 中的重复逻辑，不保留副本
- **[Trade-off] `ActivityOut` 的 payload 优先读逻辑在 Pydantic model 中比 `record_to_dict` 更复杂** → 接受：用 `@model_validator(mode='before')` 在 schema 层做字段归一化，逻辑集中在一处比散落在 to_dict 里更好维护

## Migration Plan

1. 新建 Alembic migration（`batch2_server_cleanup`），标记 server.py 补丁为已迁移
2. 清空 server.py 的补丁块，保留 FastAPI app 初始化
3. 新建 `app/schemas.py`，定义 3 个 response model
4. 新建 `app/services/` 目录，依次迁移 pipeline / candidate / activity 业务规则
5. 更新 route handler，使用 service 函数 + schema 序列化
6. 端到端验证：启动服务，逐个 endpoint 确认 response 字段完整

**回滚**：git revert，server.py 补丁恢复原状，不涉及数据库 schema 变更，回滚零风险。
