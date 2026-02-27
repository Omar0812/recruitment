## ADDED Requirements

### Requirement: Service layer exists as dedicated module
`app/services/` 目录 SHALL 存在，包含 `pipeline.py`、`candidates.py`、`activities.py` 三个模块，各自封装对应实体的核心业务规则。

#### Scenario: Service module structure
- **WHEN** 查看 `app/services/` 目录
- **THEN** 存在 `pipeline.py`、`candidates.py`、`activities.py`、`__init__.py` 四个文件

### Requirement: Pipeline business rules live in service layer
pipeline 核心业务规则 SHALL 在 `app/services/pipeline.py` 中定义，包括：候选人加入流程（`link_candidate`）、结束流程（`resolve_outcome`）、转岗（`transfer_job`）、入职（`hire_candidate`）。

#### Scenario: Link candidate validation in service
- **WHEN** 调用 `pipeline_service.link_candidate(db, candidate_id, job_id)`
- **THEN** service 执行黑名单检查、单流程约束检查，并创建 CandidateJobLink 和初始 ActivityRecord

#### Scenario: Route handler delegates to service
- **WHEN** `POST /api/pipeline/link` 被调用
- **THEN** route handler 只做参数解析，调用 service 函数，返回序列化结果，不包含业务判断逻辑

### Requirement: Activity business rules live in service layer
activity 核心业务规则 SHALL 在 `app/services/activities.py` 中定义，包括：`derive_stage`（从活动链尾推导 stage）、`sync_stage`（同步 stage 到 CandidateJobLink）、链尾约束检查、stage 自动填充。

#### Scenario: derive_stage accessible from service
- **WHEN** 其他模块（如 pipeline.py）需要推导 stage
- **THEN** 可通过 `from app.services.activities import derive_stage` 导入使用，不依赖 `app/routes/activities.py`

### Requirement: server.py contains no inline migration patches
`app/server.py` SHALL 不包含任何 `ALTER TABLE`、`CREATE TABLE IF NOT EXISTS`、`INSERT INTO ... SELECT` 等原始 SQL migration 语句。

#### Scenario: server.py line count
- **WHEN** 查看 `app/server.py`
- **THEN** 文件行数 ≤ 60 行，不含 migration 补丁块

#### Scenario: server.py startup behavior
- **WHEN** 服务器启动
- **THEN** server.py 只执行：`models.Base.metadata.create_all()`、路由注册、静态文件挂载，无 SQL 执行

### Requirement: Migration patches converted to Alembic migration
原 server.py 中的所有 schema 变更 SHALL 被转换为 Alembic migration 文件（新建第 4 个 migration），确保新环境通过 `alembic upgrade head` 即可获得完整 schema。

#### Scenario: Fresh database setup
- **WHEN** 在空数据库上运行 `alembic upgrade head`
- **THEN** 数据库包含 server.py 补丁中所有曾创建的列和表，与现有生产数据库结构一致

#### Scenario: Existing database compatibility
- **WHEN** 在已有数据库（已执行过 server.py 补丁）上运行 `alembic upgrade head`
- **THEN** migration 幂等执行，不报错，不重复创建已存在的列
