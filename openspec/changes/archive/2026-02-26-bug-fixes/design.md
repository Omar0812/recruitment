## Context

进行中页面（`renderPipelineTracking`）在启动时一次性 fetch `links` 数组，后续 `renderContent()` 只从本地数组渲染，不重新请求 API。withdraw/hire 操作成功后未更新本地数组，导致候选人仍显示在列表中。

阶段下拉在 `renderExpandInner` 中直接渲染 `job.stages` 数组并硬编码追加"已入职"选项，若岗位 stages 本身包含"已入职"则出现重复。

旧看板页面（`renderPipeline`）在 pipeline-remodel-v5 后已无存在价值，但函数和路由未清理，岗位详情页仍有入口。

## Goals / Non-Goals

**Goals:**
- withdraw/hire 后立即从进行中列表移除对应条目
- 阶段下拉不出现重复"已入职"
- 删除 `renderPipeline` 函数和 `#/jobs/pipeline/{id}` 路由
- 岗位详情招聘进展 tab 纯只读，无操作按钮

**Non-Goals:**
- 重构进行中页的数据获取策略（留给 activity-records-remodel）
- 修改岗位详情页其他 tab

## Decisions

**本地数组更新 vs 重新 fetch**：选择直接从本地 `links` 数组 splice 移除条目，不重新 fetch。原因：重新 fetch 会导致所有展开行折叠，用户体验差；withdraw/hire 是终态操作，移除条目是正确行为，无需服务端数据校验。

**阶段下拉过滤**：渲染 stageOptions 时过滤掉值为"已入职"的选项，再追加硬编码的 `__hire__` 选项。

**看板删除范围**：删除 `renderPipeline` 函数、`#/jobs/pipeline/{id}` 路由匹配、岗位详情页内所有指向看板的链接。`renderCard`、`loadInterviewList` 等仅被看板使用的辅助函数一并删除。

## Risks / Trade-offs

- [本地 splice 后 links 数组与服务端不同步] → 仅影响当次会话，刷新页面后恢复一致，可接受
- [删除看板后用户书签失效] → 路由返回"页面不存在"，影响极小
