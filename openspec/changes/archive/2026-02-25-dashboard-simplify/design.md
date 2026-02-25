## Context

首页 `renderDashboard` 函数当前包含双视图 tab 切换逻辑，将内容分为 `dashboard-job-view` 和 `dashboard-people-view` 两层。人视图内容与"流程跟进"页面重叠，tab 增加了不必要的复杂度。

## Goals / Non-Goals

**Goals:**
- 删除 tab 按钮和切换逻辑
- 首页内容直接平铺：上传区 → 待跟进 → 健康度 → AI建议
- 减少 `renderDashboard` 函数复杂度

**Non-Goals:**
- 不改动 API 或后端
- 不改动其他页面
- 不重新设计首页布局或样式

## Decisions

**直接删除，不做重定向**：人视图内容已在"流程跟进"页面完整呈现，无需在首页保留入口或跳转提示。

## Risks / Trade-offs

- [风险] 用户习惯了人视图 → 缓解：流程跟进页面提供相同功能，侧边栏导航清晰
