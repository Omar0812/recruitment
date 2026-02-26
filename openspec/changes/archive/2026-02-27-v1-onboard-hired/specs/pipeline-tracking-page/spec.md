## MODIFIED Requirements

### Requirement: Offer 接受后 Next Step 改为 onboard 流程
Offer 接受后的 Next Step SHALL 显示"确认入职"表单（创建 onboard 活动），不再直接弹出 hire 确认弹窗。

#### Scenario: Offer 接受后的 Next Step
- **WHEN** offer conclusion=接受 且 outcome 仍为 null
- **THEN** 显示"确认入职"区域，内含入职日期输入框 + 备注输入框 + 确认按钮

#### Scenario: 确认入职完成
- **WHEN** 用户填写入职日期并点击确认
- **THEN** 创建 onboard 活动（自动 outcome=hired），候选人从进行中列表移除

## REMOVED Requirements

### Requirement: offer 接受后显示确认入职按钮
**Reason**: 替换为 onboard 活动流程。不再使用简单的确认按钮+hire弹窗，改为填写入职日期的 onboard 表单。
**Migration**: Next Step 中的"确认入职"按钮替换为 onboard 表单内联渲染。
