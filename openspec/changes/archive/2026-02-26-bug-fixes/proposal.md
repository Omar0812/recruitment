## Why

进行中页面存在多个影响日常使用的 bug：候选人退出后不从列表消失、阶段下拉出现重复"已入职"选项、旧看板页面未清理导致入口混乱、岗位详情招聘进展 tab 仍有操作入口。这些问题影响核心工作流的可靠性，需要在下一个大版本重构前修复。

## What Changes

- 修复退出/入职后候选人仍显示在进行中列表的问题（本地 links 数组未更新）
- 修复阶段下拉重复显示"已入职"选项（job.stages 含"已入职"时与硬编码选项冲突）
- 删除旧看板页面（`renderPipeline` 函数、`#/jobs/pipeline/{id}` 路由）
- 岗位详情页"招聘进展" tab 改为纯只读展示，移除所有操作按钮

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `pipeline-tracking`: 进行中页本地状态管理修复（withdraw/hire 后移除本地条目）
- `job-detail`: 招聘进展 tab 改为只读，删除看板路由入口

## Impact

- `static/app.js`: `renderPipelineTracking`（links 数组更新逻辑）、`renderExpandInner`（阶段下拉过滤）、`renderPipeline` 函数删除、路由删除、岗位详情 tab 改只读
- `static/index.html`: 无变更
- 后端：无变更
