## MODIFIED Requirements

### Requirement: Job list serial number column
独立编号列 SHALL 被移除。编号 SHALL 合并到职位名称单元格，以副标题形式显示，格式为 `@001`（零填充至3位）。

#### Scenario: 编号显示在副标题
- **WHEN** 用户查看岗位列表
- **THEN** 职位名称下方第一行显示 `@001` 格式编号，无独立编号列

### Requirement: Job list subtitle
职位名称单元格 SHALL 显示两行副标题：第一行为 `@编号`，第二行为「城市 · 部门 · 类型」，缺失字段跳过。

#### Scenario: 完整副标题
- **WHEN** 岗位有城市、部门、类型
- **THEN** 第二行显示「上海 · 技术 · 全职」

#### Scenario: 部分字段缺失
- **WHEN** 岗位无类型
- **THEN** 第二行显示「上海 · 技术」

### Requirement: Job list stage distribution badge
候选人进展列 SHALL 使用 emoji 格式显示：📄（简历筛选数）🎯（面试中数，合并电话初筛+面试阶段）🎁（Offer数），仅显示有候选人的项。

#### Scenario: 有多阶段候选人
- **WHEN** 简历筛选3人、面试2人、Offer1人
- **THEN** 显示「📄3 🎯2 🎁1」

#### Scenario: 无活跃候选人
- **WHEN** 岗位无活跃候选人
- **THEN** 显示「-」

### Requirement: Job list close action
操作列 SHALL 新增「关闭」按钮，点击后弹出确认，确认后将岗位状态更新为 closed。

#### Scenario: 一键关闭岗位
- **WHEN** 用户点击某岗位的「关闭」按钮并确认
- **THEN** 岗位状态变为 closed，列表刷新

### Requirement: Job list remove last activity column
「最后活动」列 SHALL 从表格中移除。

#### Scenario: 列表无最后活动列
- **WHEN** 用户查看岗位列表
- **THEN** 表格不显示最后活动列
