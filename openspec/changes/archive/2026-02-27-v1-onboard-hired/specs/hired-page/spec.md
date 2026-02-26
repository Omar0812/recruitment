## Requirements

### Requirement: 已入职候选人列表页面
系统 SHALL 提供"已入职"页面（路由 `#/hired`），展示所有 outcome=hired 的候选人。导航栏新增"已入职"链接。

#### Scenario: 查看已入职列表
- **WHEN** 用户点击导航栏"已入职"
- **THEN** 显示表格：候选人姓名（链接到档案）、入职岗位、入职日期、入职天数、来源

#### Scenario: 搜索已入职候选人
- **WHEN** 用户在搜索框输入关键词
- **THEN** 按候选人姓名过滤列表

#### Scenario: 无已入职候选人
- **WHEN** 系统中没有 outcome=hired 的记录
- **THEN** 显示"暂无已入职人员"空状态

### Requirement: 已入职 API
系统 SHALL 提供 `GET /api/pipeline/hired` 端点，返回已入职候选人列表。

#### Scenario: 获取已入职列表
- **WHEN** 前端请求 GET /api/pipeline/hired
- **THEN** 返回所有 outcome=hired 的 CandidateJobLink，包含 candidate_name、job_title、start_date（来自 onboard 活动）、hired_at（link 更新时间）、source

### Requirement: 人才库已入职限制
人才库中已入职的候选人 SHALL 显示"已入职"标签，隐藏"推荐到岗位"按钮。

#### Scenario: 已入职候选人在人才库中
- **WHEN** 候选人有 outcome=hired 的 link
- **THEN** 人才库列表中该候选人行显示"已入职"标签，不显示推荐按钮
