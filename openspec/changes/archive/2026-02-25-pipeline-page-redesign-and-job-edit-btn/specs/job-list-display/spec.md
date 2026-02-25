## MODIFIED Requirements

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

### Requirement: 岗位库列表提供编辑入口
岗位库列表每行操作列 SHALL 提供"编辑"链接，跳转至岗位编辑页面。看板 header SHALL 不再显示"编辑岗位"按钮。

#### Scenario: 从岗位库进入编辑
- **WHEN** HR 在岗位库列表点击某岗位的"编辑"链接
- **THEN** 系统跳转至 #/jobs/edit/{id} 编辑页面

#### Scenario: 看板 header 无编辑按钮
- **WHEN** HR 进入某岗位的看板页面
- **THEN** header 只显示返回按钮和岗位标题，不显示"编辑岗位"按钮
