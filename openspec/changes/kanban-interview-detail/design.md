## Context

当前看板（pipeline kanban）中，候选人卡片只记录所在阶段和简单备注，没有结构化的面试记录。HR需要在系统外（微信/飞书/Excel）记录面试轮次、面试官、评价等信息，导致信息分散、难以追溯。

技术栈：FastAPI + SQLAlchemy + SQLite，前端原生 JS 单页应用。

## Goals / Non-Goals

**Goals:**
- 新增 `InterviewRecord` 模型，支持多轮面试记录
- 看板卡片支持查看和新增面试记录
- 淘汰候选人时支持记录原因
- `CandidateJobLink` 新增 `rejection_reason` 字段

**Non-Goals:**
- 面试官账号体系（面试官只是文本字段，不做用户管理）
- 面试日历/日程提醒（属于下一个模块）
- 面试评价模板自定义

## Decisions

**1. InterviewRecord 作为独立表，而非塞进 CandidateJobLink**
- 一个候选人在同一岗位可能经历多轮面试，1:N 关系需要独立表
- 备选方案：用 JSON 字段存在 CandidateJobLink.notes 里 → 无法查询和排序，放弃

**2. 评分用 1-5 整数**
- 简单直观，够用
- 备选方案：百分制 → 过于精细，面试官难以区分 72 和 75 分

**3. 淘汰原因枚举值**
- 固定选项：能力不足 / 薪资不匹配 / 主动放弃 / 其他
- 备选方案：自由文本 → 数据不规范，难以统计分析

**4. 前端交互：看板卡片内嵌展开面板**
- 点击卡片展开，底部显示面试记录列表 + 新增按钮
- 备选方案：跳转新页面 → 打断看板操作流，放弃

## Risks / Trade-offs

- [SQLite 无 ALTER COLUMN] → 新字段用 ALTER TABLE ADD COLUMN，默认 NULL，兼容存量数据
- [前端卡片交互复杂度增加] → 面试记录面板用简单 inline HTML，不引入新组件

## Migration Plan

1. `ALTER TABLE candidate_job_links ADD COLUMN rejection_reason VARCHAR`
2. 新建 `interview_records` 表
3. 部署新后端代码
4. 前端静态文件刷新即生效，无需迁移数据

回滚：删除新表和新列，回退代码即可，存量数据不受影响。
