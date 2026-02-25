## Context

人才库列表通过 `/api/candidates` 获取候选人数据。当前接口不返回 job_links 信息，前端只显示关联岗位数量。需要在列表接口中补充 `active_links` 字段（仅含 outcome 为空的关联），前端新增一列展示。

## Goals / Non-Goals

**Goals:**
- 后端列表接口新增 `active_links` 字段
- 前端人才库表格新增"当前岗位·阶段"列

**Non-Goals:**
- 不改动候选人详情接口
- 不支持通过该列跳转或操作
- 不处理多个活跃岗位的复杂展示（显示第一个即可）

## Decisions

**只返回 active_links（outcome 为空）**：已淘汰/退出的关联不代表当前状态，不应显示在列表中。

**多个活跃岗位时显示全部**：用换行或逗号分隔，避免信息丢失。

## Risks / Trade-offs

- [性能] 列表接口需 join job_links 表 → SQLAlchemy 懒加载已有关联，影响可控
