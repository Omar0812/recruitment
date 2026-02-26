## MODIFIED Requirements

### Requirement: 候选人详情流程 tab 使用活动链派生阶段
候选人详情页"流程" tab 的时间轴 SHALL 从活动链派生阶段展示，不再依赖 job_stages 字段。

#### Scenario: 活动链派生时间轴
- **WHEN** 候选人当前流程有 resume_review(完成) → interview(进行中)
- **THEN** 时间轴显示 简历筛选(完成) → 一面(进行中)，从活动链自动生成

#### Scenario: 无活动记录时显示默认
- **WHEN** 候选人流程无任何活动记录
- **THEN** 时间轴显示"待处理"状态

#### Scenario: 历史 phone_screen 记录正确显示
- **WHEN** 候选人流程包含历史 phone_screen 活动
- **THEN** 时间轴中该节点显示为"电话初筛"

## REMOVED Requirements

### Requirement: 候选人详情流程 tab 使用岗位真实阶段
**Reason**: Job.stages 字段已删除，job_stages 不再存在。时间轴改为从活动链派生。
**Migration**: 前端删除对 job_stages 的依赖，改为遍历活动链生成时间轴节点。

## ADDED Requirements

### Requirement: 岗位创建编辑表单不含 stages 和 interview_rounds
岗位创建和编辑表单 SHALL 不包含阶段配置区域和面试轮次配置。

#### Scenario: 创建岗位表单
- **WHEN** 用户打开创建岗位表单
- **THEN** 表单不显示 stages textarea 和 interview_rounds 输入框

#### Scenario: 编辑岗位表单
- **WHEN** 用户打开编辑岗位表单
- **THEN** 表单不显示 stages textarea 和 interview_rounds 输入框
