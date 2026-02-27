## Why

多处关键功能存在运行时失效（解除黑名单完全不可用、活动记录更新被覆盖、候选人合并丢失数据），以及多个逻辑错误导致数据显示不准确。这些 bug 直接影响日常使用，需在推进新功能前先清除。

## What Changes

- 修复 `app.js` 的 `api.delete()` 不支持传 request body，导致解除黑名单 API 调用永远失败
- 修复 `update_activity` PATCH 接口只更新稀疏列、不同步 payload，导致面评/offer 更新被旧 payload 覆盖
- 修复 `dedup.py` merge 时迁移废弃的 `interview_records` 关联而非 `activity_records`，导致合并候选人丢失活动记录
- 修复 `Candidate.name` NOT NULL 约束但 API 无前置校验，传空值返回 500 而不是友好 400
- 修复 `insights.py` P2「建档未分配」错误包含 HIRED/WITHDRAWN 候选人
- 修复 `onboard` 活动因链尾约束逻辑被错误阻断（offer conclusion 为 null 时不允许创建 onboard）
- 修复 `InterviewRecord` 模型 `__tablename__` 仍指向已改名表，导致 SQLAlchemy 重建空表
- 修复 `jobs.py list_jobs` N+1 查询（遍历 candidate_links 访问 candidate 关联未用 joinedload）

## Capabilities

### New Capabilities
（无新能力，全部为 bug 修复）

### Modified Capabilities
- `candidate-api`: 解除黑名单 DELETE 接口需 body 支持；name 字段空值校验
- `activity-records`: update_activity 需同步 payload；onboard 链尾约束逻辑修正
- `resume-dedup`: merge 时迁移 activity_records 而非废弃的 interview_records
- `insights-api`: P2 unassigned 过滤逻辑修正（排除 HIRED/WITHDRAWN）
- `job-api`: list_jobs 加 joinedload 消除 N+1

## Impact

- `static/app.js` — api.delete 方法（第15行）
- `app/routes/activities.py` — update_activity、create_activity（链尾约束）
- `app/routes/dedup.py` — merge_candidates
- `app/routes/candidates.py` — create_candidate name 校验
- `app/routes/insights.py` — get_today P2 unassigned 逻辑
- `app/routes/jobs.py` — list_jobs joinedload
- `app/models.py` — InterviewRecord __tablename__ 处理
