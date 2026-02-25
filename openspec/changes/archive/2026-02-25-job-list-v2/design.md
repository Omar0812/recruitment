## Context

岗位库页面经过上一轮迭代（job-list-improvements）已有基础的搜索/筛选/badge功能。本次在此基础上重构信息架构：新增 type/priority 数据模型字段，重构前端布局（搜索与筛选分离、表格列重组），并优化视觉层级。

现有代码：
- `app/models.py`: Job 模型无 type/priority 字段
- `app/routes/jobs.py`: list_jobs 支持 q/department 参数
- `static/app.js`: renderJobList 有 filter-bar，renderJobForm 无 type/priority
- SQLite 数据库已存在，需要 ALTER TABLE 添加新列

## Goals / Non-Goals

**Goals:**
- Job 模型新增 type（全职/实习/顾问）和 priority（高/中/低）字段
- 搜索栏独立，支持回车+按钮确认
- 筛选栏独立，新增 type/priority 筛选
- 表格重构：编号合并到副标题、删除最后活动列、emoji 候选人进展、一键关闭
- 创建/编辑岗位表单新增 type/priority 选择
- 视觉层级优化

**Non-Goals:**
- 数据迁移脚本（SQLAlchemy 启动时自动 ALTER TABLE 处理新列，旧数据默认 NULL）
- 批量操作
- 排序功能

## Decisions

**1. 数据库新列处理**
SQLAlchemy 的 `create_all` 不会自动 ALTER TABLE 添加新列到已存在的表。需要在 `database.py` 或启动时用 `ALTER TABLE` 补丁，或直接删除 db 文件重建。
选择：在 `server.py` 启动时执行 `ALTER TABLE IF NOT EXISTS` 兼容补丁，避免破坏现有数据。

**2. 搜索确认方式**
搜索框支持：① 回车键触发 ② 点击搜索按钮触发 ③ 保留 debounce 300ms 自动触发（三者并存）。
理由：覆盖不同用户习惯，debounce 保留给快速浏览场景。

**3. 一键关闭**
复用现有 `PATCH /api/jobs/{id}` 接口，传 `{status: "closed"}`，不新增接口。
前端点击后 confirm 确认，成功后刷新列表。

**4. 候选人进展 emoji 格式**
固定映射前三个阶段：📄（简历筛选）🎯（面试中，合并电话初筛+面试）🎁（Offer）。
其余阶段数字累加到最近匹配的 emoji 桶。自定义阶段名无法精确映射时，按阶段顺序分配。

**5. 优先级标签配色**
- 高：红色背景 `#fee2e2 / #dc2626`
- 中：橙色背景 `#fff3cd / #d97706`
- 低：灰色背景 `#f0f0f0 / #666`

## Risks / Trade-offs

- [ALTER TABLE 补丁] SQLite 不支持 `ALTER TABLE ADD COLUMN IF NOT EXISTS`，需要 try/except 包裹 → 已在设计中处理
- [emoji 阶段映射] 自定义阶段名无法精确对应 emoji → 接受，按顺序分配，覆盖大多数场景

## Migration Plan

1. 启动时执行 ALTER TABLE 补丁添加 type/priority 列（默认 NULL）
2. 前端表单新增字段，旧岗位编辑时可补填
3. 无需数据迁移脚本
