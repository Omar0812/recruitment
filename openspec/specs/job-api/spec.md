## Purpose
定义岗位相关 API 的数据返回规范。

## Requirements

### Requirement: active_count 过滤软删除候选人
`GET /api/jobs` 返回的每个岗位的 `active_count` SHALL 只统计 `candidate.deleted_at IS NULL` 的活跃关联。

#### Scenario: 已合并候选人不计入 active_count
- **WHEN** 岗位有 3 个活跃关联，其中 1 个候选人已被软删除
- **THEN** 该岗位的 `active_count` 返回 2

#### Scenario: 无软删除候选人时 active_count 不变
- **WHEN** 岗位的所有活跃关联候选人均未被软删除
- **THEN** `active_count` 与实际关联数一致

### Requirement: list_jobs 使用 joinedload 避免 N+1
`GET /api/jobs` SHALL 使用 SQLAlchemy `joinedload` 预加载 `candidate_links` 及其关联的 `candidate`，避免对每个 job 的每个 link 单独查询 candidate。

#### Scenario: 查询岗位列表不触发 N+1
- **WHEN** 系统有 10 个岗位，每个岗位平均 5 个候选人关联
- **THEN** `GET /api/jobs` 只执行 1-2 条 SQL 查询（join 加载），而非 50+ 条

#### Scenario: active_count 和 hired_count 计算结果不变
- **WHEN** 加入 joinedload 后重新查询
- **THEN** 每个岗位的 active_count、hired_count、stage_counts、last_activity 结果与未优化前一致

## REMOVED Requirements

### Requirement: get_candidate 的 job_links 包含 job_stages
**Reason**: Job.stages 字段已删除，job_stages 不再存在。流程阶段完全由活动链自动派生。
**Migration**: 前端不再依赖 job_stages 字段。候选人详情页的流程 tab 改为从活动链派生阶段展示。

### Requirement: Job model includes stages field
**Reason**: stages 是假功能，从未被用户自定义，且已被活动链自动派生取代。
**Migration**: 删除 Job.stages 列、JobCreate/JobUpdate 中的 stages 字段、job_to_dict 中的 stages 返回。DEFAULT_STAGES 常量删除。

### Requirement: Job model includes interview_rounds field
**Reason**: interview_rounds 是假功能，面试轮次完全由活动链自动计数（nextInterviewRound 函数）。
**Migration**: 删除 Job.interview_rounds 列、CandidateJobLink.interview_rounds 列、PATCH `/api/pipeline/link/{id}/interview-rounds` 端点。前端已不使用此字段。
