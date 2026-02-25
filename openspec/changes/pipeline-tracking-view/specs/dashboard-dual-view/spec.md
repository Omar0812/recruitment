## ADDED Requirements

### Requirement: 首页支持人视图和岗位视图切换
系统 SHALL 在首页提供"人视图"和"岗位视图"两个 tab，默认显示岗位视图。

#### Scenario: 切换到人视图
- **WHEN** HR 点击首页"人视图" tab
- **THEN** 系统显示按阶段分组的所有活跃人选列表，每行显示姓名、所属岗位、停留天数

#### Scenario: 切换到岗位视图
- **WHEN** HR 点击首页"岗位视图" tab
- **THEN** 系统显示现有 dashboard 内容（岗位健康度、待处理事项等）

#### Scenario: 默认视图
- **WHEN** HR 进入首页
- **THEN** 系统默认显示岗位视图
