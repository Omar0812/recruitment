## ADDED Requirements

### Requirement: 设置候选人跟进状态
系统 SHALL 允许 HR 为候选人设置跟进状态（待跟进/已联系/暂不考虑）。

#### Scenario: 设置跟进状态
- **WHEN** HR 在人才库或候选人详情页选择跟进状态
- **THEN** 系统保存并立即更新展示

#### Scenario: 清除跟进状态
- **WHEN** HR 选择"未设置"选项
- **THEN** 系统将 followup_status 置为 NULL，展示为"未设置"

### Requirement: 跟进状态在列表中可见
系统 SHALL 在人才库列表中展示每个候选人的跟进状态。

#### Scenario: 展示跟进状态标签
- **WHEN** HR 查看人才库列表
- **THEN** 每个候选人行显示跟进状态标签，未设置时显示"-"
