## ADDED Requirements

### Requirement: 记录淘汰原因
系统 SHALL 在 HR 将候选人标记为淘汰时，要求选择淘汰原因。

#### Scenario: 淘汰时选择原因
- **WHEN** HR 点击看板卡片的"淘汰"操作
- **THEN** 系统弹出选择框，提供"能力不足 / 薪资不匹配 / 主动放弃 / 其他"四个选项，HR 确认后保存

#### Scenario: 未选择原因直接提交
- **WHEN** HR 未选择淘汰原因直接点击确认
- **THEN** 系统阻止提交并提示"请选择淘汰原因"

### Requirement: 展示淘汰原因
系统 SHALL 在已淘汰候选人的看板卡片上展示淘汰原因。

#### Scenario: 查看已淘汰候选人
- **WHEN** HR 查看已淘汰候选人的卡片
- **THEN** 系统在卡片上显示淘汰原因标签
