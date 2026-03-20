# 岗位（Jobs）

> 岗位元信息管理中心 + 招聘全景看板。创建、编辑、关闭岗位，日常巡视各岗位进展。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/jobs` | 岗位列表，分页 + status 筛选 + keyword 搜索 |
| GET | `/jobs/{id}` | 岗位详情（含 hired_count + stage_distribution） |
| POST | `/jobs` | 新建岗位（返回 201） |
| PUT | `/jobs/{id}` | 更新岗位（仅 open 状态可编辑，closed 返回 400） |
| POST | `/jobs/{id}/close` | 关闭岗位（reason 必填，级联 reject 所有 IN_PROGRESS Application） |
| GET | `/applications?job_id={id}` | 获取岗位下所有 Application（候选人 Tab 用） |

**GET /jobs 查询参数**：`page, page_size(默认20), status(open|closed|不传=全部), keyword(岗位名模糊，LIKE 通配符 % _ 自动转义)`

**JobRead 返回字段**：`id, title, department, location_name, location_address, headcount, jd, priority(high|medium|low), target_onboard_date, notes, status(open|closed), close_reason, closed_at, hired_count, stage_distribution, created_at, updated_at`

**JobCreate 必填**：`title, department, location_name, headcount(≥1), jd`；选填：`location_address, priority(默认medium), target_onboard_date, notes`

**JobUpdate**：所有字段 Optional，仅更新传入的字段

**JobCloseRequest**：`reason`（必填，min_length=1）

## 页面

路由 `/jobs`，页面组件 `JobsView.vue`

- **列表页**：标题「岗位」+ 右上角 [+ 新建岗位]
- **筛选器**（`JobFilters.vue`）：状态切换（招聘中 / 已关闭 / 全部，默认招聘中）+ 关键词搜索
- **岗位列表**（`JobList.vue` → `JobCard.vue`）：卡片三行——名称(地点)+状态+优先级 / headcount进度条(N/M到岗) / 阶段分布+deadline。日期显示 `MM-DD`（调用 `utils/date.ts` 的 `formatShortDate`）
- **岗位详情面板**（`JobPanel.vue`，右侧滑入 Teleport）：
  - 三个 Tab：基本信息（`BasicInfoTab.vue`，目标到岗日期显示 `YYYY-MM-DD`，调用 `formatDate`）/ JD（`JDTab.vue`，含复制）/ 候选人（`CandidatesTab.vue`，按阶段分组展示）
  - 底部操作栏（仅 open 状态显示）：[编辑] + [关闭岗位]
- **新建/编辑**（`JobCreateForm.vue`）：面板内表单，创建后切为查看模式；编辑后回查看模式
- **关闭岗位**（`CloseJobDialog.vue`）：选择原因 + 显示受影响的 Application 列表 + 确认

## 业务规则

- **状态机**：open → closed，不可逆，不可重开
- **关闭级联**：关闭岗位时，所有 IN_PROGRESS Application 自动变为 REJECTED，outcome=`rejected`（Outcome 枚举值）。每个被级联淘汰的 Application 同时写入一条 `APPLICATION_ENDED` Event，payload=`{"outcome": "rejected", "reason": "岗位关闭"}`，actor 为执行关闭操作的用户
- **编辑限制**：closed 岗位不可编辑（后端抛 BusinessError `job_not_editable`）
- **排序**：列表按 id DESC（最新在前）
- **location 同步**：创建/编辑时 location_name 同步写入 city 字段（兼容旧字段）
- **location_address 回查**：如果 Job 自身无 location_address，从 Term(type=location) 按名称匹配获取
- **headcount 进度**：hired_count = 该岗位 HIRED 状态的 Application 数
- **阶段分布**：stage_distribution = 该岗位 IN_PROGRESS Application 按 stage 分组计数
- **审计日志**：create_job / update_job / close_job 操作写入 AuditLog + ActionReceipt
- **路由联动**：URL `?panel={jobId}` 自动打开该岗位面板

## 与其他模块的交互

- **候选人面板**：候选人 Tab 点击候选人名字 → 打开候选人面板（`returnToJobId` 参数使面板可 [← 返回岗位]）
- **进行中**：候选人面板内 [→ 去进行中操作] → 跳转 `/pipeline`
- **今日简报**：脉搏行 open 岗位可点 → `/jobs`；关注区岗位 → `/jobs?panel={jobId}`
- **公司页**：部门/地点下拉选项从 Term 词表读取
- **新建候选人**：关联岗位步骤从 open 岗位列表选择

## ⚠️ spec 与代码差异

- **前端分页**：前端 `fetchJobs` 默认 page_size=100（一次拉全量），与后端默认 page_size=20 不同（前端主动覆盖）
- **关闭原因 + toast 撤回**：spec 与代码一致——三选项（招满了 / 需求取消 / 其他）+ 确认后 `showToastUndo` 延迟执行，撤回期内不调 API
