## Why

流程跟进页面当前是一个带筛选栏的纯表格，视觉上缺乏层次感，分组信息不够突出。参考岗位库的分组卡片设计，改为每组一个 section 卡片，让 HR 一眼看清各岗位/阶段的人选情况。

## What Changes

- 将 `renderPipelineTracking` 的输出从"筛选栏+单一表格"改为"筛选栏+多个分组卡片"
- 每个分组渲染为独立卡片：头部显示分组名称+人数，内部为候选人表格
- 保留按岗位/阶段分组切换下拉和岗位筛选下拉
- 按岗位分组时，卡片头部岗位名可点击跳转到看板

## Capabilities

### New Capabilities

### Modified Capabilities
- `pipeline-tracking-page`: 页面布局从单一表格改为分组 section 卡片形式

## Impact

- `static/app.js`：`renderPipelineTracking` 函数重写渲染逻辑
- 无后端改动，无 API 变更
