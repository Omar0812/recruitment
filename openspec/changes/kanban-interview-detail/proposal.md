## Why

看板"面试"阶段目前只能记录候选人在哪个阶段,缺乏面试轮次、面试官、评价等关键信息,导致HR无法在系统内追踪面试进展,只能依赖外部记录。

## What Changes

- 每个候选人-岗位关联（CandidateJobLink）支持记录多条面试记录（轮次、面试官、时间、评分、评语）
- 看板卡片展开后可查看/新增面试记录
- 支持记录淘汰原因（现在只有 rejected 状态，没有原因）
- 支持记录阶段停留时长（自动计算）

## Capabilities

### New Capabilities
- `interview-record`: 面试记录的增删查，包含轮次、面试官、时间、评分（1-5）、评语、结论（通过/待定/淘汰）
- `rejection-reason`: 候选人被淘汰时记录原因（能力不足/薪资不匹配/主动放弃/其他）

### Modified Capabilities
- `pipeline-kanban`: 看板卡片新增面试记录入口和展示，淘汰操作新增原因选择

## Impact

- 后端：新增 `InterviewRecord` 模型和对应 API（`/api/interviews`）
- 后端：`CandidateJobLink` 新增 `rejection_reason` 字段
- 前端：`app.js` 看板卡片交互扩展
- 数据库：新增 `interview_records` 表，`candidate_job_links` 表新增字段
