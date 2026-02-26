## ADDED Requirements

### Requirement: active_count 过滤软删除候选人
`GET /api/jobs` 返回的每个岗位的 `active_count` SHALL 只统计 `candidate.deleted_at IS NULL` 的活跃关联。

#### Scenario: 已合并候选人不计入 active_count
- **WHEN** 岗位有 3 个活跃关联，其中 1 个候选人已被软删除
- **THEN** 该岗位的 `active_count` 返回 2

#### Scenario: 无软删除候选人时 active_count 不变
- **WHEN** 岗位的所有活跃关联候选人均未被软删除
- **THEN** `active_count` 与实际关联数一致

### Requirement: get_candidate 的 job_links 包含 job_stages
`GET /api/candidates/{id}` 返回的 `job_links` 数组中每条记录 SHALL 包含 `job_stages` 字段（岗位的阶段列表）。

#### Scenario: job_links 包含 job_stages
- **WHEN** 客户端请求 `GET /api/candidates/{id}`
- **THEN** 返回的 `job_links` 每条记录包含 `job_stages: string[]` 字段
