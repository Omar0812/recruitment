## ADDED Requirements

### Requirement: 活动卡片共享组件
`frontend/src/components/ActivityCard.vue` SHALL 实现活动记录卡片，用于在候选人详情时间线和进行中页面展示单条活动记录。

#### Scenario: 展示面试活动卡片
- **WHEN** 渲染 type='interview' 的活动记录
- **THEN** 显示轮次、面试官、时间、评分（1-5星）、结论、面评备注

#### Scenario: 展示 offer 活动卡片
- **WHEN** 渲染 type='offer' 的活动记录
- **THEN** 显示月薪、薪资月数、其他现金、入职日期、结论

#### Scenario: 展示 note 活动卡片
- **WHEN** 渲染 type='note' 的活动记录
- **THEN** 显示备注内容和创建时间

### Requirement: 活动表单共享组件
`frontend/src/components/ActivityForm.vue` SHALL 实现添加/编辑活动记录的表单，根据 type 动态显示对应字段。

#### Scenario: 面试表单字段
- **WHEN** type='interview'
- **THEN** 显示：轮次（必填）、面试官、时间、地点、状态（安排中/已完成/取消）、评分、结论、备注

#### Scenario: Offer 表单字段
- **WHEN** type='offer'
- **THEN** 显示：月薪（数字）、薪资月数、其他现金、入职日期、结论、备注

#### Scenario: 提交后刷新时间线
- **WHEN** 表单提交成功（POST /api/activities）
- **THEN** 父组件的活动时间线自动更新，无需手动刷新

### Requirement: 确认弹窗共享组件
`frontend/src/components/ConfirmDialog.vue` SHALL 实现通用确认弹窗，用于淘汰、退出、关闭岗位等破坏性操作的二次确认。

#### Scenario: 确认弹窗显示
- **WHEN** 调用 `confirmDialog.open({ title, message, onConfirm })`
- **THEN** 显示 ElDialog，标题和内容按参数渲染，点击确认执行 onConfirm 回调
