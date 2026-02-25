## Why

首页当前有"岗位视图/人视图"双 tab，增加了认知负担，且人视图的内容与"流程跟进"页面高度重叠。首页应聚焦于快速概览和简历上传，保持干净简洁。

## What Changes

- 删除首页顶部的"岗位视图"/"人视图"两个 tab 按钮
- 删除 `dashboard-job-view` 和 `dashboard-people-view` 两个包装 div
- 删除所有 tab 切换逻辑（tabJob.onclick / tabPeople.onclick）
- 保留：简历上传区、今日待跟进 card、岗位健康度 card、AI 建议 card
- 内容直接平铺渲染，无需 tab 切换

## Capabilities

### New Capabilities
<!-- 无新能力 -->

### Modified Capabilities
- `dashboard-dual-view`: 删除双视图 tab，首页只保留单一视图（上传 + 待跟进 + 健康度 + AI建议）

## Impact

- `static/app.js`：`renderDashboard` 函数简化
- 无 API 变更，无后端改动
