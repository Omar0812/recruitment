## MODIFIED Requirements

### Requirement: list_jobs 使用 joinedload 避免 N+1
`GET /api/jobs` SHALL 使用 SQLAlchemy `joinedload` 预加载 `candidate_links` 及其关联的 `candidate`，避免对每个 job 的每个 link 单独查询 candidate。

#### Scenario: 查询岗位列表不触发 N+1
- **WHEN** 系统有 10 个岗位，每个岗位平均 5 个候选人关联
- **THEN** `GET /api/jobs` 只执行 1-2 条 SQL 查询（join 加载），而非 50+ 条

#### Scenario: active_count 和 hired_count 计算结果不变
- **WHEN** 加入 joinedload 后重新查询
- **THEN** 每个岗位的 active_count、hired_count、stage_counts、last_activity 结果与未优化前一致
