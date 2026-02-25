## MODIFIED Requirements

### Requirement: Job list keyword search
搜索栏 SHALL 独占一行，包含搜索输入框和确认按钮。搜索 SHALL 支持三种触发方式：点击确认按钮、按回车键、输入停顿300ms自动触发。

#### Scenario: 点击按钮搜索
- **WHEN** 用户输入关键词后点击搜索按钮
- **THEN** 列表刷新显示匹配结果

#### Scenario: 回车搜索
- **WHEN** 用户输入关键词后按回车
- **THEN** 列表刷新显示匹配结果

#### Scenario: 自动搜索
- **WHEN** 用户输入关键词后停顿300ms
- **THEN** 列表自动刷新显示匹配结果

### Requirement: Job list filter bar
筛选栏 SHALL 独占一行，与搜索栏分离，包含：状态下拉、部门下拉、类型下拉、优先级下拉、显示已关闭 checkbox。

#### Scenario: 筛选栏独立显示
- **WHEN** 用户查看岗位库
- **THEN** 第一行为搜索栏，第二行为筛选栏，视觉上明显分离

#### Scenario: 类型筛选
- **WHEN** 用户选择「全职」类型
- **THEN** 列表仅显示全职岗位

#### Scenario: 优先级筛选
- **WHEN** 用户选择「高」优先级
- **THEN** 列表仅显示高优先级岗位
