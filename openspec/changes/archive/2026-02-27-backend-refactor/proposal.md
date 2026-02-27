## Why

后端代码经过多轮迭代，积累了三类技术债：`server.py` 混入 ~120 行手动 SQL migration 补丁（每次启动都执行）、业务逻辑直接堆在 route handler 里无法复用、以及每个实体都有手写 `_to_dict()` 序列化函数导致字段变更需要改三处。现在前端已完成 Vue 3 重构，后端是影响持续开发效率的最大阻力，是时候清理。

## What Changes

- **清理 `server.py` migration 补丁**：将 ~120 行原始 `ALTER TABLE` SQL 补丁迁移为正式 Alembic migration 文件，`server.py` 只保留 FastAPI app 初始化逻辑（目标 <50 行）
- **引入 service 层**：新建 `app/services/` 目录，将 pipeline、candidates、activities 的核心业务规则从 route handler 中抽离，route 只做 HTTP 处理
- **统一 Pydantic 序列化**：用 Pydantic v2 response schema 替代手写 `candidate_to_dict()`、`link_to_dict()`、`record_to_dict()`，新增字段只改一处
- **ActivityRecord 稀疏列清理**（可选，视迁移风险决定是否纳入）：正式废弃并删除已由 `payload JSON` 替代的稀疏列

## Capabilities

### New Capabilities

- `backend-service-layer`：`app/services/` 目录，封装 pipeline、candidate、activity 业务规则，route handler 只做参数校验和 HTTP 响应
- `backend-pydantic-schemas`：统一的 Pydantic response model，替代手写 `_to_dict()`，字段变更只改 schema 一处

### Modified Capabilities

- `candidate-api`：response 格式不变，但序列化逻辑迁移到 Pydantic schema（行为兼容，实现变更）
- `pipeline-data-integrity`：pipeline 业务规则（黑名单检查、单流程约束、状态机转换）迁移到 service 层，行为不变
- `activity-records`：`record_to_dict()` 替换为 Pydantic schema，payload 优先逻辑保留

## Impact

- **改动文件**：`app/server.py`、`app/routes/candidates.py`、`app/routes/pipeline.py`、`app/routes/activities.py`、新增 `app/services/`、新增 `alembic/versions/` migration 文件
- **API 兼容性**：所有 API endpoint 路径和 response 结构保持不变，前端无需改动
- **数据库**：新 Alembic migration 文件覆盖现有补丁逻辑，不改变 schema（补丁已执行过）
- **依赖**：无新依赖，pydantic 已在 fastapi 依赖链中
