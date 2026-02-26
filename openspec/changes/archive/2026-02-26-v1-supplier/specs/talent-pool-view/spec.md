## MODIFIED Requirements

### Requirement: 人才库多维筛选
系统 SHALL 支持按跟进状态、供应商、技能标签筛选候选人。来源筛选 SHALL 从动态文本值改为从 suppliers 表加载。

#### Scenario: 按跟进状态筛选
- **WHEN** HR 选择跟进状态筛选项（待跟进/已联系/暂不考虑）
- **THEN** 系统只展示该跟进状态的候选人

#### Scenario: 按供应商筛选
- **WHEN** HR 在供应商下拉中选择某个供应商
- **THEN** 系统只展示 supplier_id 匹配该供应商的候选人

#### Scenario: 筛选未关联供应商的候选人
- **WHEN** HR 在供应商下拉中选择"未关联供应商"
- **THEN** 系统只展示 supplier_id 为 null 的候选人

#### Scenario: 人才库表格显示供应商名称
- **WHEN** HR 查看人才库列表
- **THEN** "来源"列显示供应商名称（有 supplier_id 时）或原始 source 值（无 supplier_id 时）
