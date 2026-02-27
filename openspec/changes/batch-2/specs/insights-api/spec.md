## ADDED Requirements

### Requirement: 今日待办接口
系统 SHALL 提供 `GET /api/insights/today` 接口，返回按优先级分组的待办项列表及本周概览数据。接口无需参数，直接基于当前系统时间计算。

#### Scenario: 正常返回待办列表
- **WHEN** 客户端请求 `GET /api/insights/today`
- **THEN** 返回包含 `today`（列表）和 `week_summary`（对象）的 JSON

#### Scenario: 无任何待办时返回空列表
- **WHEN** 系统中无任何符合条件的待办项
- **THEN** 返回 `{"today": [], "week_summary": {...}}`

---

### Requirement: P0 — 今天/明天有面试安排
接口 SHALL 将今天或明天有 `status='scheduled'` 面试的候选人列为 P0 待办，类型为 `interview_today`。每场面试一条。返回字段包括：link_id、activity_id、candidate_name、job_title、stage、scheduled_at、interviewer（actor）、location、last_interview_summary（上轮面评摘要，可为 null）。

#### Scenario: 今天有面试
- **WHEN** 存在 `type='interview'`、`status='scheduled'`、`scheduled_at` 在今天的活动记录
- **THEN** 返回一条 P0 待办，type=`interview_today`

#### Scenario: 明天有面试
- **WHEN** 存在 `scheduled_at` 在明天的已安排面试
- **THEN** 同样返回 P0 待办，type=`interview_today`

#### Scenario: 上轮面评摘要
- **WHEN** 该候选人在同一 link 下有已完成的面试记录
- **THEN** `last_interview_summary` 返回最近一次已完成面试的 round/score/conclusion/comment

---

### Requirement: P0 — Offer 超 5 天无结论
接口 SHALL 将 `type='offer'`、创建超过 5 天且无 conclusion 的活动记录列为 P0 待办，类型为 `offer_waiting`。返回字段：link_id、activity_id、candidate_name、job_title、offer_days（已等待天数）、offer_created_at、monthly_salary。

#### Scenario: Offer 超 5 天无回复
- **WHEN** 存在 offer 活动，payload.conclusion 为 null，且 `created_at < now - 5天`
- **THEN** 返回 P0 待办，type=`offer_waiting`，offer_days 为实际天数

#### Scenario: Offer 已有结论时不提醒
- **WHEN** offer 活动 payload.conclusion 不为 null（接受/拒绝/谈判中）
- **THEN** 不返回该条待办

---

### Requirement: P1 — 面试结束超 2 天未填面评
接口 SHALL 将 `type='interview'`、`status='scheduled'`、`scheduled_at` 已超过 2 天前的活动列为 P1 待办，类型为 `interview_feedback_missing`。这意味着面试时间已过但仍为 scheduled 状态（未填面评）。

#### Scenario: 面试已过 2 天未填面评
- **WHEN** interview 活动 status='scheduled' 且 scheduled_at < now - 2天
- **THEN** 返回 P1 待办，type=`interview_feedback_missing`，days_missing 为实际天数

#### Scenario: 已填面评的面试不提醒
- **WHEN** interview 活动 status='completed'
- **THEN** 不返回该条待办

---

### Requirement: P1 — 流程停滞超 5 天
接口 SHALL 将 `state='IN_PROGRESS'`、`updated_at` 超过 5 天未更新的 CandidateJobLink 列为 P1 待办，类型为 `pipeline_stale`。返回字段：link_id、candidate_name、job_title、stage、days_stale、last_updated。

#### Scenario: 流程停滞超 5 天
- **WHEN** CandidateJobLink state='IN_PROGRESS' 且 updated_at < now - 5天
- **THEN** 返回 P1 待办，type=`pipeline_stale`，days_stale 为实际天数

#### Scenario: 有今日待办的停滞流程不重复出现
- **WHEN** 某候选人已出现在 P0（今天有面试）
- **THEN** 不再出现在 P1 停滞列表中（避免同一人出现两次）

---

### Requirement: P2 — 建档未分配岗位
接口 SHALL 将有 Candidate 记录但无任何 `outcome=null` 的 CandidateJobLink 的候选人列为 P2 待办，类型为 `unassigned_candidates`。多个候选人合并为一条，包含 candidates 数组（id/name/created_at）。

#### Scenario: 有未分配候选人
- **WHEN** 存在 candidates 表中有记录，但无 outcome=null 的 CandidateJobLink
- **THEN** 返回一条 P2 待办，type=`unassigned_candidates`，candidates 数组包含所有未分配候选人

#### Scenario: 软删除候选人不计入
- **WHEN** 候选人 deleted_at 不为 null
- **THEN** 不计入未分配列表

---

### Requirement: 本周概览数据
接口 SHALL 在响应中包含 `week_summary` 对象，字段：`in_progress`（进行中人数）、`interviews_this_week`（本周已安排面试场数）、`offers_pending`（无结论的 Offer 数）、`hired_this_week`（本周 hired 的 CandidateJobLink 数）。本周定义为本周一 00:00 至今。

#### Scenario: 返回本周概览
- **WHEN** 请求 `GET /api/insights/today`
- **THEN** 响应包含 week_summary，四个字段均为非负整数
