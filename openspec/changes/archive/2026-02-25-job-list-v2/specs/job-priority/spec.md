## ADDED Requirements

### Requirement: Job priority field
Job 模型 SHALL 支持 `priority` 字段，可选值为「高/中/低」，默认为空（不设置）。

#### Scenario: 创建岗位时设置优先级
- **WHEN** 用户在新建岗位表单选择优先级
- **THEN** 岗位保存后 priority 字段存储对应值

#### Scenario: 列表显示优先级标签
- **WHEN** 岗位有 priority 值
- **THEN** 列表中该岗位行显示对应颜色的优先级标签（高=红、中=橙、低=灰）

#### Scenario: 无优先级时不显示标签
- **WHEN** 岗位 priority 为空
- **THEN** 列表中不显示优先级标签
