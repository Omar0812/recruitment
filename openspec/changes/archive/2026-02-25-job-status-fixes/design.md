## Context

岗位库页面有两个独立的筛选控件：状态下拉（`#job-status-filter`）和"显示已关闭"复选框（`#show-closed`）。后端通过 `include_closed` 参数决定是否返回已关闭岗位，前端再用下拉值做二次过滤。两者逻辑未联动，导致单独选下拉"已关闭"时后端不返回数据，筛选失效。

候选人详情 header 同时显示 `name`（中文名）和 `name_en`（英文名），但没有判断两者是否相同，AI 解析时可能将同一个名字写入两个字段，导致重复显示。

## Goals / Non-Goals

**Goals:**
- 下拉选"已关闭"时自动包含已关闭岗位（`include_closed=true`）
- `name_en` 与 `name` 相同时不重复显示

**Non-Goals:**
- 不改后端 API
- 不改数据库结构
- 不处理其他筛选联动逻辑

## Decisions

**筛选联动**：在 `loadJobs()` 里，构建请求参数时判断 `status === "closed"`，若是则强制 `include_closed=true`，无需改复选框状态，保持两个控件独立可用。

**名字去重**：渲染 header 时加一个判断 `c.name_en && c.name_en !== c.name`，只有英文名存在且与中文名不同时才显示。

## Risks / Trade-offs

- 无数据迁移风险，纯前端改动
- 复选框和下拉仍然独立，用户勾选复选框但下拉选"招聘中"时行为不变，符合预期
