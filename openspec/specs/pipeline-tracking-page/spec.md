## Purpose
定义流程跟进页面的展示和交互规范，提供所有活跃候选人的统一视图。
## Requirements
### Requirement: 流程跟进页面展示所有活跃人选
系统 SHALL 提供流程跟进页面，展示所有当前在招聘流程中（outcome 为 NULL）的候选人及其岗位和阶段。

#### Scenario: 查看流程跟进列表
- **WHEN** HR 进入流程跟进页面
- **THEN** 系统展示所有活跃候选人，每行显示姓名、岗位、阶段、最后更新时间

#### Scenario: 无活跃人选
- **WHEN** 系统中没有任何活跃候选人-岗位关联
- **THEN** 系统显示"暂无进行中的人选"空状态

### Requirement: 按岗位/阶段分组切换
系统 SHALL 支持在"按岗位分组"和"按阶段分组"两种视图间切换。

#### Scenario: 切换为按阶段分组
- **WHEN** HR 选择"按阶段分组"
- **THEN** 系统将人选按招聘阶段分组，每个阶段为独立卡片，内部表格显示姓名、所属岗位、停留天数

#### Scenario: 切换为按岗位分组
- **WHEN** HR 选择"按岗位分组"
- **THEN** 系统将人选按岗位分组，每个岗位为独立卡片

### Requirement: 按岗位筛选
系统 SHALL 支持按岗位筛选流程跟进列表。

#### Scenario: 选择特定岗位
- **WHEN** HR 从岗位下拉中选择某个岗位
- **THEN** 系统只展示该岗位的活跃人选卡片

### Requirement: 流程跟进搜索 null 安全
流程跟进页面搜索候选人时 SHALL 安全处理 `candidate_name` 为 null 的情况，不抛出 JS 错误。

#### Scenario: 搜索候选人姓名为 null 时不崩溃
- **WHEN** HR 在搜索框输入关键词，且列表中存在 candidate_name 为 null 的记录
- **THEN** 系统跳过该记录继续过滤，不抛出 TypeError

