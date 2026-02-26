## MODIFIED Requirements

### Requirement: 进度点从活动链派生
进度点渲染 SHALL 完全基于活动链，不再依赖 job_stages 预定义列表。每个已完成的 chain activity 渲染为实心点，当前活动渲染为空心点。

#### Scenario: 简单流程进度点
- **WHEN** 候选人有 resume_review(完成,通过) → interview(进行中)
- **THEN** 进度点显示: ●简历筛选 → ○一面

#### Scenario: 多轮面试进度点
- **WHEN** 候选人有 resume_review(完成) → interview一面(完成) → interview二面(进行中)
- **THEN** 进度点显示: ●简历筛选 → ●一面 → ○二面

#### Scenario: 历史 phone_screen 进度点
- **WHEN** 候选人有历史 phone_screen 活动在链中
- **THEN** 该节点显示为 ●电话初筛，标签从 STAGE_LABEL 映射

#### Scenario: 仅 resume_review pending
- **WHEN** 候选人只有一个 pending 的 resume_review
- **THEN** 进度点显示: ○简历筛选

#### Scenario: 到 Offer 阶段
- **WHEN** 候选人有 resume_review(完成) → interview(完成) → offer(进行中)
- **THEN** 进度点显示: ●简历筛选 → ●一面 → ○Offer

## REMOVED Requirements

### Requirement: 进度点依赖 job_stages
**Reason**: Job.stages 字段已删除。进度点改为纯活动链派生，更准确反映实际流程。
**Migration**: 删除 renderProgressDots 和 renderProgress 中对 job_stages/l.job_stages 的引用，改为遍历活动链生成节点。
