## Context

现有系统以岗位为中心，候选人进展需要进入岗位看板才能查看。候选人页面（`#/candidates`）只是档案列表，没有进度信息。首页 Dashboard 只有岗位维度汇总。

技术栈：FastAPI + SQLAlchemy + SQLite，前端原生 JS 单页应用。

## Goals / Non-Goals

**Goals:**
- 新增 `/api/pipeline/active` 接口，返回所有活跃候选人-岗位关联
- 新增"流程跟进"页面（`#/pipeline`），以人为中心展示进度
- 首页新增人视图/岗位视图切换
- 导航栏"候选人"改为"流程跟进"

**Non-Goals:**
- 修改看板本身的交互
- 候选人档案页面的改动
- 人才库页面的改动

## Decisions

**1. 新增 `/api/pipeline/active` 接口而非复用现有接口**
- 现有 `/api/pipeline/jobs/{job_id}/pipeline` 是按岗位查，需要遍历所有岗位才能拿到全量数据
- 新接口直接查 `CandidateJobLink` 表，`outcome IS NULL`，一次返回所有活跃关联
- 返回字段：candidate_id, candidate_name, job_id, job_title, stage, days_since_update, notes

**2. 流程跟进页面默认按岗位分组**
- 用户心智：先想到"前端工程师这个岗位的人"，再想到具体的人
- 支持切换为"按阶段分组"
- 备选方案：平铺列表 → 信息密度低，岗位多时难以区分

**3. 首页切换用 tab 按钮，不用路由**
- 切换频繁，不需要独立 URL
- 状态保存在内存，刷新回默认岗位视图

## Risks / Trade-offs

- [候选人页面路由变更] → `#/candidates` 保留重定向到 `#/pipeline`，避免书签失效
- [首页改动影响现有 dashboard] → 岗位视图保持现有内容不变，只是包一层 tab

## Migration Plan

1. 后端新增接口，无数据库变更
2. 前端新增页面和路由
3. 导航栏更新
4. 首页加 tab 切换
