## Why

现有"候选人"页面只是一个人员列表，没有招聘进度信息，HR 想查看手上所有人的进展必须逐个进入岗位看板，操作路径长、效率低。首页 Dashboard 也只有岗位维度的汇总，缺乏以人为中心的进度视图。

## What Changes

- 将"候选人"页面改名为"流程跟进"，改造为招聘进度总览
- 流程跟进列表显示每个人当前关联的岗位和所在阶段
- 首页新增人视图/岗位视图切换，人视图按阶段分组展示所有进行中的人选
- 导航栏对应更新

## Capabilities

### New Capabilities
- `pipeline-tracking-page`: 流程跟进页面，展示所有关联了岗位的候选人及其当前岗位·阶段，支持按岗位/阶段筛选
- `dashboard-dual-view`: 首页支持人视图（按阶段分组的人选列表）和岗位视图（现有 dashboard）切换

### Modified Capabilities
- `candidate-list`: 候选人列表页改名为"流程跟进"，导航入口和页面标题更新

## Impact

- 前端：`app.js` 新增 `renderPipelineTracking()` 函数，改造 `renderDashboard()`
- 前端：`index.html` 导航栏文字和路由更新
- 后端：新增 `/api/pipeline/active` 接口，返回所有活跃中的候选人-岗位关联（含候选人信息、岗位信息、阶段）
- 无数据库变更
