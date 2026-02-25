## Why

流程跟进页目前是一张平铺大表，没有分组和优先级感知，HR 无法快速判断"哪个岗位进展如何"或"哪些候选人需要推进"。同时看板 header 里有"编辑岗位"按钮，上下文错误，应归属于岗位库。

## What Changes

- 流程跟进页重构为分组视图：默认按岗位分组，支持切换为按阶段分组
- 每个分组为独立卡片，展示该组内所有活跃候选人（姓名/阶段/最后更新）
- 保留搜索功能（跨分组搜索）
- 看板 header 移除"编辑岗位"按钮，该入口移至岗位库列表的操作列

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `pipeline-tracking-page`: 从平铺表格改为分组卡片视图，新增按岗位/按阶段分组切换
- `job-list-display`: 岗位库列表操作列新增"编辑"入口；看板 header 移除"编辑岗位"按钮

## Impact

- `static/app.js`：renderPipelineTracking（重构分组渲染逻辑）、renderPipeline（移除 header 编辑按钮）、renderJobList（操作列加编辑链接）
- 无后端变更，无数据库变更
