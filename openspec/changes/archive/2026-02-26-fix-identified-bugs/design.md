## Context

recruitment 项目是一个 FastAPI + 原生 JS 的招聘管理工具。代码审查发现 13 个 bug，分布在后端路由（candidates.py、jobs.py）和前端（app.js）。所有修复均为局部改动，无架构变更、无新依赖、无数据库 schema 变更。

## Goals / Non-Goals

**Goals:**
- 修复所有 13 个已识别 bug
- 保持 API 合约不变（无 breaking change）
- 统一前端错误提示风格（全部走 showToast / api helper）

**Non-Goals:**
- 不新增功能
- 不重构代码结构
- 不修改数据库 schema

## Decisions

**后端修复策略：最小改动原则**
- `check_duplicate` 死代码直接删除，不影响任何调用方
- PATCH 接口加 `deleted_at.is_(None)` 过滤，与 GET 接口保持一致
- `active_count` 过滤软删除：在列表推导式中加 `lnk.candidate and lnk.candidate.deleted_at is None`
- 搜索加 `name_en`：在 `or_()` 中追加一个 `ilike` 条件

**前端修复策略：就地修改，不抽象**
- 简历下载 URL：改用手动拼接路径，不用 `encodeURIComponent`（路径已是安全的相对路径）
- 阶段列表：从 `activeLink` 中取 `job_stages`（API 已返回），fallback 到默认阶段
- null 安全：`c.name || c.name_en || "?"`
- 删除面试记录：改用 `api.delete`（需在 api helper 中补充 delete 方法）
- 面评弹窗重置：复用已有的 `initInterviewOverlay` 重置逻辑
- 备注保存：`alert()` → `showToast()`
- 岗位表单：保存按钮加 `withLoading`

**api helper 补充 delete 方法**
当前 `api` 对象只有 get/post/patch，需补充 `delete` 方法，与其他方法风格一致。

## Risks / Trade-offs

- [风险] 候选人详情流程 tab 的阶段列表依赖 `activeLink.job_stages`，但该字段来自 `/api/pipeline/active`，而候选人详情页走的是 `/api/candidates/{id}`，返回的 `job_links` 中没有 `job_stages` 字段 → **缓解**：从 `activeLink.job_id` 额外请求岗位信息，或在 `get_candidate` 接口的 `job_links` 中补充 `job_stages` 字段（选后者，改动更小）
- [风险] 修复 PATCH 软删除过滤后，已合并候选人的更新请求会返回 404，调用方需能处理 → 影响范围仅限内部调用，已有 toast 提示

## Migration Plan

无数据迁移。直接修改代码文件，重启服务器生效。
