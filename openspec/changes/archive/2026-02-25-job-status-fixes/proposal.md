## Why

两个前端 bug 导致岗位库筛选功能失效，以及候选人详情页在中英文名相同时重复显示名字，影响日常使用体验。

## What Changes

- 修复岗位库状态筛选逻辑：下拉选"已关闭"时自动触发 `include_closed=true`，不再依赖用户手动勾选复选框
- 修复候选人详情 header：当 `name_en` 与 `name` 内容相同时，不重复显示英文名

## Capabilities

### New Capabilities

- `job-status-filter`: 岗位库状态筛选联动逻辑——下拉选择与"显示已关闭"复选框保持同步

### Modified Capabilities

- 无

## Impact

- `static/app.js`：`renderJobList()` 中的 `loadJobs()` 函数，以及候选人详情 header 渲染逻辑
- 无后端改动，无 API 变更，无数据库变更
