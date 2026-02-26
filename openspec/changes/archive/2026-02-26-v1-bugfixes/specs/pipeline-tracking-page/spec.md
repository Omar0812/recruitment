## MODIFIED Requirements

### Requirement: 流程跟进页面展示所有活跃人选
系统 SHALL 提供流程跟进页面，以分组卡片形式展示所有当前在招聘流程中（outcome 为 NULL）的候选人。默认按岗位分组，支持切换为按阶段分组。每个分组为独立卡片，内部表格显示姓名、阶段（按岗位分组时）或岗位（按阶段分组时）、最后更新时间、快捷操作。stage 标签从活动链派生显示，后端自动维护。当转移岗位操作完成后，系统 SHALL 重新获取最新的活跃人选数据并刷新页面，确保新link和旧link的状态正确显示。

#### Scenario: 默认按岗位分组查看
- **WHEN** HR 进入流程跟进页面
- **THEN** 系统以岗位为分组展示卡片，每张卡片标题为岗位名和人数，内部列出该岗位所有活跃候选人及其当前 stage

#### Scenario: 切换为按阶段分组
- **WHEN** HR 点击"按阶段"切换按钮
- **THEN** 系统以 stage 为分组展示卡片，stage 值来自 CandidateJobLink.stage（后端自动维护）

#### Scenario: 切换回按岗位分组
- **WHEN** HR 点击"按岗位"切换按钮
- **THEN** 系统恢复按岗位分组视图

#### Scenario: 无活跃人选
- **WHEN** 系统中没有任何活跃候选人-岗位关联
- **THEN** 系统显示"暂无进行中的人选"空状态

#### Scenario: 转移岗位后页面刷新
- **WHEN** 用户在展开行中完成转移岗位操作
- **THEN** 系统 SHALL 重新 fetch `/api/pipeline/active` 获取最新数据，替换本地 links 数组，并重新渲染页面内容，确保旧link消失、新link出现在正确的岗位分组中
