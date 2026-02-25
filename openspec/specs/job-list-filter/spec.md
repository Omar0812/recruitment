### Requirement: Job list keyword search
岗位库 SHALL 支持按关键词搜索，匹配职位名称、部门、负责HR字段。后端 `GET /api/jobs` SHALL 接受 `q` 查询参数。

#### Scenario: 搜索匹配结果
- **WHEN** 用户在搜索框输入关键词
- **THEN** 列表仅显示职位名称、部门或HR字段包含该关键词的岗位

#### Scenario: 搜索无结果
- **WHEN** 用户输入的关键词无任何匹配
- **THEN** 列表显示空状态提示

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索框
- **THEN** 列表恢复显示全部岗位

### Requirement: Job list department filter
岗位库 SHALL 支持按部门筛选。后端 `GET /api/jobs` SHALL 接受 `department` 查询参数（精确匹配）。

#### Scenario: 按部门筛选
- **WHEN** 用户从部门下拉选择某个部门
- **THEN** 列表仅显示该部门的岗位

#### Scenario: 部门选项动态生成
- **WHEN** 页面加载完成
- **THEN** 部门下拉选项从当前返回的岗位列表中提取唯一值

### Requirement: Job list status filter
岗位库 SHALL 支持按状态筛选（全部/招聘中/暂停/已关闭）。

#### Scenario: 按状态筛选
- **WHEN** 用户从状态下拉选择某个状态
- **THEN** 列表仅显示该状态的岗位

#### Scenario: 默认不显示已关闭
- **WHEN** 页面首次加载
- **THEN** 已关闭岗位不显示，状态下拉默认为「招聘中+暂停」
