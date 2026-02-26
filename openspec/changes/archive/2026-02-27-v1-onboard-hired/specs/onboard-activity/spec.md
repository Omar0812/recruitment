## Requirements

### Requirement: onboard 活动类型定义
系统 SHALL 支持 `onboard` 活动类型，作为 CHAIN_TYPES 成员，STAGE_LABEL 映射为"入职确认"。onboard 活动使用 ActivityRecord 现有字段：`start_date`（入职日期）、`comment`（备注）、`conclusion`（固定为"已入职"）。

#### Scenario: 创建 onboard 活动
- **WHEN** 前端 POST /api/activities 提交 type="onboard"，包含 start_date 和 comment
- **THEN** 后端创建 ActivityRecord，自动设置 conclusion="已入职"、status="completed"，并自动将对应 CandidateJobLink.outcome 设为 "hired"

#### Scenario: onboard 在活动链中的位置
- **WHEN** 候选人活动链为 resume_review → interview → offer(接受) → onboard
- **THEN** 进度条显示 ●(简历筛选) → ●(面试) → ●(Offer) → ●(入职确认)，stage 派生为"入职确认"

### Requirement: onboard 表单渲染
系统 SHALL 提供 onboard 表单，包含入职日期（date input）和备注（textarea），通过 openDialog 渲染。

#### Scenario: 展开行中显示 onboard 表单
- **WHEN** Offer 活动 conclusion="接受" 且 outcome 仍为 null，用户查看 Next Step
- **THEN** 显示"确认入职"表单：入职日期输入框 + 备注输入框 + 确认按钮

#### Scenario: 保存 onboard 活动
- **WHEN** 用户填写入职日期并点击确认
- **THEN** 创建 onboard 活动，候选人从进行中列表移除，显示成功提示

### Requirement: Offer 拒绝自动淘汰
当 Offer 活动 conclusion="拒绝" 时，系统 SHALL 自动将 CandidateJobLink.outcome 设为 "rejected"，rejection_reason 设为"候选人拒绝Offer"。

#### Scenario: Offer 被拒绝
- **WHEN** 用户在 Offer 表单选择 conclusion="拒绝" 并保存
- **THEN** 系统自动调用 outcome 接口标记淘汰，候选人从进行中列表移除
