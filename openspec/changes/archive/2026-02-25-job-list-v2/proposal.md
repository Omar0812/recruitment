## Why

岗位库列表在上一轮迭代后仍有多处体验问题：搜索缺少确认交互、筛选栏与搜索栏混在一起、表格信息架构混乱（编号列冗余、缺少岗位类型/优先级/base、最后活动列无用、候选人进展信息密度低、缺少一键关闭操作）。本次迭代全面重构岗位库页面的交互和信息架构。

## What Changes

- 搜索栏独占一行，支持回车和点击按钮两种确认方式
- 筛选栏独立一行，包含状态/部门/类型/优先级筛选
- 删除独立编号列，编号合并到职位名称副标题（`@001`格式）
- 职位名称第二行显示「城市 · 部门 · 类型」
- 新增岗位类型字段（全职/实习/顾问），在创建/编辑岗位时可选
- 新增优先级字段（高/中/低），在创建/编辑岗位时可选，列表显示彩色标签
- 候选人进展改为 emoji 格式（📄简历数 🎯面试中 🎁Offer）
- 新增一键关闭按钮（操作列）
- 删除「最后活动」列
- 视觉层级优化：行高、字重、状态标签配色

## Capabilities

### New Capabilities
- `job-priority`: 岗位优先级管理，包括字段定义、创建/编辑表单选择、列表展示
- `job-type`: 岗位类型字段（全职/实习/顾问），包括字段定义、表单选择、列表展示

### Modified Capabilities
- `job-list-display`: 重构职位名称展示（编号合并、副标题格式）、候选人进展 emoji 格式、删除最后活动列、新增关闭按钮、视觉优化
- `job-list-filter`: 搜索栏与筛选栏分离、搜索支持回车+按钮确认、新增类型/优先级筛选

## Impact

- `app/models.py`: Job 模型新增 `type`（String）和 `priority`（String）字段
- `app/routes/jobs.py`: `job_to_dict` 新增字段；`list_jobs` 新增 `type`/`priority` 筛选参数；新增 PATCH close 快捷接口或复用现有 PATCH
- `static/app.js`: `renderJobList` 重构；`renderJobForm` 新增 type/priority 字段
- `static/style.css`: 优先级标签样式、视觉层级优化
- `data/recruitment.db`: 需要 SQLite ALTER TABLE 或重建（SQLAlchemy 自动处理新列）
