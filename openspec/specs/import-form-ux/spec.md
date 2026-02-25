## ADDED Requirements

### Requirement: 导入弹窗积木式教育/工作经历编辑
导入弹窗 SHALL 以积木块形式展示教育经历和工作经历，AI 解析出几条就渲染几块，每块可删除，底部有「+ 添加」按钮新增空白块。不预设空白行。

#### Scenario: AI 解析出多条经历
- **WHEN** AI 从简历中提取到 2 条教育经历和 3 条工作经历
- **THEN** 弹窗渲染 2 个教育积木块和 3 个工作积木块，每块填充对应数据

#### Scenario: 用户新增积木块
- **WHEN** 用户点击「+ 添加教育经历」
- **THEN** 在列表末尾追加一个空白教育积木块供填写

#### Scenario: 用户删除积木块
- **WHEN** 用户点击某积木块的删除按钮
- **THEN** 该块从列表中移除，其余块不受影响

### Requirement: 投递岗位选项显示格式
导入弹窗的岗位选择 SHALL 将「关联岗位」改名为「投递岗位」，选项格式为「岗位名 @编号」（如「前端工程师 @001」）。

#### Scenario: 岗位选项展示
- **WHEN** 弹窗加载岗位列表
- **THEN** 每个选项显示为「{title} @{id三位补零}」格式

### Requirement: AI prompt 提取全量经历
AI 简历解析 SHALL 返回 `education_list` 数组和 `work_experience` 数组，包含简历中所有可识别的经历条目。

#### Scenario: 多段经历提取
- **WHEN** 简历包含本科+硕士教育经历和两段工作经历
- **THEN** AI 返回 `education_list` 含 2 条，`work_experience` 含 2 条
