## ADDED Requirements

### Requirement: Job list serial number column
岗位列表 SHALL 显示 `#` 编号列，值为岗位的数据库自增 ID，格式为 `#001`（零填充至3位）。

#### Scenario: 同名岗位区分
- **WHEN** 列表中存在两个相同职位名称的岗位
- **THEN** 每行显示不同的 `#` 编号，用户可通过编号区分

### Requirement: Job list subtitle
职位名称单元格 SHALL 在名称下方显示副标题，格式为「部门 · 城市 · 创建时间」，缺失字段跳过不显示。

#### Scenario: 完整副标题
- **WHEN** 岗位有部门、城市、创建时间
- **THEN** 副标题显示「技术 · 上海 · 2024-01-15」

#### Scenario: 部分字段缺失
- **WHEN** 岗位无城市信息
- **THEN** 副标题显示「技术 · 2024-01-15」，不显示空占位符

### Requirement: Job list stage distribution badge
候选人数列 SHALL 改为阶段分布 badge，每个有候选人的阶段显示「● 阶段名N」格式，仅显示活跃候选人（未淘汰/未退出）。

#### Scenario: 有多个阶段候选人
- **WHEN** 岗位在「筛选」阶段有2人、「面试」阶段有3人
- **THEN** 显示「● 筛选2 ● 面试3」

#### Scenario: 无活跃候选人
- **WHEN** 岗位无活跃候选人
- **THEN** 显示「-」

### Requirement: Fix job list button underline
「+ 新建岗位」按钮 SHALL 不显示下划线，与其他 `.btn` 样式一致。

#### Scenario: 按钮无下划线
- **WHEN** 用户查看岗位库页面
- **THEN** 「+ 新建岗位」按钮无文字下划线
