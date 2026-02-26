## ADDED Requirements

### Requirement: 人才库视图展示全量候选人
系统 SHALL 提供人才库页面，展示所有候选人，不依赖岗位关联状态。

#### Scenario: 查看人才库
- **WHEN** HR 进入人才库页面
- **THEN** 系统展示所有候选人列表，包含姓名、技能标签、跟进状态、当前岗位·阶段、来源

#### Scenario: 无候选人
- **WHEN** 系统中没有任何候选人
- **THEN** 系统显示"暂无候选人"空状态

#### Scenario: 候选人有活跃流程
- **WHEN** 候选人当前在某岗位流程中（outcome 为空）
- **THEN** 系统在"当前岗位·阶段"列显示岗位名称和当前阶段，格式为"岗位名 · 阶段"

#### Scenario: 候选人无活跃流程
- **WHEN** 候选人没有任何活跃的岗位关联（全部已淘汰/退出或未关联）
- **THEN** 系统在"当前岗位·阶段"列显示"-"

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

### Requirement: 从人才库推荐候选人到岗位
系统 SHALL 允许 HR 在人才库中直接将候选人关联到某个岗位。

#### Scenario: 推荐到岗位
- **WHEN** HR 点击候选人行的"推荐到岗位"按钮并选择目标岗位
- **THEN** 系统创建候选人-岗位关联，并跳转到该岗位看板
