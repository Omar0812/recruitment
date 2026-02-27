## Context

项目使用 FastAPI + SQLAlchemy + SQLite 后端，原生 JS 前端（单文件 app.js 3750行）。在 batch-1/2 完成后，双写 payload 过渡期引入了读写不一致问题；同时 InterviewRecord 废弃迁移未清理干净，导致多处引用残留。这批 bug 是在全面测试中发现的，覆盖前端 API 层、后端路由逻辑、ORM 模型三个层次。

## Goals / Non-Goals

**Goals:**
- 修复 8 个已确认 bug，恢复相关功能的正确性
- 不引入新功能，不改变 API 契约
- 每个修复最小化改动范围，降低引入新问题的风险

**Non-Goals:**
- 不做 payload 到稀疏列的完整迁移（那是独立的技术债任务）
- 不重构 InterviewRecord 模型的删除（保持 bak 表存在，只修 ORM 引用问题）
- 不改变 dedup merge 的整体逻辑，只修迁移目标

## Decisions

**D1：api.delete body 修复**
在 `app.js` 第15行的 `api.delete` 实现中加入 body 支持（与 `lib/api.js` 保持一致）。
`app.js` 和 `lib/api.js` 目前并存两套，只修 `app.js` 的那份，不做合并（合并是 Vue 迁移的工作）。

**D2：update_activity payload 同步策略**
更新稀疏列的同时，也用新值更新 payload 中对应字段。不重建整个 payload（避免丢失未在 ActivityUpdate 中定义的 payload 字段）。具体：对每个被更新的字段，如果 payload 存在且该字段在 payload 中有值，则同步更新。

**D3：dedup merge 迁移目标**
将 `sec_link.interview_records` 改为 `sec_link.activity_records`，迁移到主档案对应 link 下。废弃的 InterviewRecord 关联不再迁移（数据库层面 interview_records_bak 表已独立，与 cascade 无关）。

**D4：name 校验位置**
在 `create_candidate` 函数入口处校验：name 和 name_en 都为空时返回 400。使用 HTTPException 而非 Pydantic validator（保持现有风格）。

**D5：insights P2 unassigned 过滤**
增加条件：候选人的所有 job_links 都有 outcome（包括 hired/rejected/withdrawn），才算"未分配"。排除那些曾经入职/退出但当前没有活跃流程的候选人不算"未分配"，他们有历史记录。改为：has_active = any(lnk.outcome is None ...) 逻辑保持，但 unassigned 的定义改为"从未有过任何 link"或"所有 link 都是终态且没有 open job"——实际上已入职候选人应该从 unassigned 列表排除，只显示真正从未开始流程的。

**D6：onboard 链尾约束豁免**
`onboard` 类型在链尾约束中特殊处理：检查上一条 chain 活动时，如果上一条是 offer 类型，允许 conclusion 为 null（offer 谈判中可直接确认入职）。或更简单：onboard 类型完全跳过链尾约束（因为 onboard 是终态操作，不存在"未完成就继续"的语义）。选择后者：onboard 跳过链尾约束。

**D7：InterviewRecord ORM 问题**
不删除 InterviewRecord 模型类（可能有其他代码引用），而是在 server.py 的 `create_all` 之前，让 InterviewRecord 映射到 `interview_records_bak`（已 rename 的表），或直接从 `models.py` 中移除 InterviewRecord 类，用 `__abstract__ = True` 或直接删除。
选择：从 models.py 删除 InterviewRecord 类定义，从 CandidateJobLink 移除 interview_records relationship，从 dedup.py 和 interviews.py 移除引用（interviews.py 路由也在 server.py 中未挂载，可直接删除）。

**D8：list_jobs N+1**
在 `list_jobs` 查询中加 `joinedload(Job.candidate_links).joinedload(CandidateJobLink.candidate)` 预加载，避免 N+1。

## Risks / Trade-offs

- **D2 payload 同步**：merge 策略是"更新已存在的 payload key"，如果 payload 结构未来变化可能有遗漏 → 可接受，payload 迁移是独立任务
- **D7 删除 InterviewRecord**：interviews.py 路由虽未挂载但仍存在，删除模型后该文件会报错 → 一并删除 interviews.py 文件，或注释掉
- **D6 onboard 跳过链尾约束**：理论上允许在任意阶段直接 onboard → 符合产品建模（onboard 是显式的入职确认，不受阶段限制）

## Migration Plan

所有修复均为代码层改动，无数据库 schema 变更，无需 Alembic 迁移。直接修改代码文件后重启服务即可生效。
