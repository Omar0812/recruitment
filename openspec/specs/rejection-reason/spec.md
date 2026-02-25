## Purpose
定义候选人淘汰原因的记录和展示规范，确保 HR 在淘汰操作时选择原因，并在看板卡片上正确显示。
## Requirements
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

### Requirement: 淘汰原因后端序列化
后端 `link_to_dict` SHALL 在序列化 CandidateJobLink 时包含 `rejection_reason` 字段，确保前端可正确显示淘汰原因标签。

#### Scenario: link_to_dict 序列化包含 rejection_reason
- **WHEN** 后端序列化 CandidateJobLink 对象
- **THEN** 返回的 JSON 中包含 `rejection_reason` 字段，值为字符串或 null

