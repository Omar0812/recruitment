## Architecture

无新增模块，复用现有 ActivityRecord 模型和活动链架构。

## Design Decisions

### 1. onboard 活动类型

复用 ActivityRecord 现有字段：
- `type = "onboard"`
- `start_date` — 入职日期（已有字段，原 offer 用）
- `comment` — 入职备注
- `conclusion` — "已入职"（固定值，保存时自动设置）

CHAIN_TYPES 新增 `"onboard"`，STAGE_LABEL 新增 `onboard → "入职确认"`。

### 2. Offer→Onboard 流程变更

当前流程：Offer 接受 → 弹 hire 确认弹窗 → 直接 outcome=hired

新流程：
1. Offer 接受 → Next Step 显示"确认入职"（创建 onboard 活动，status=scheduled）
2. 用户填写入职日期+备注 → 保存 onboard 活动（conclusion="已入职"，status=completed）
3. 后端自动设置 outcome=hired

简化：onboard 不需要 scheduled 状态，直接一步完成（填表单→保存→hired）。

### 3. Offer 拒绝自动处理

Offer conclusion="拒绝" 时，前端保存活动后自动调用 `PATCH /api/pipeline/link/{id}/outcome` 设置 outcome=rejected，rejection_reason="候选人拒绝Offer"。

### 4. 已入职页面

新增路由 `#/hired`，导航栏新增"已入职"项。

后端新增 `GET /api/pipeline/hired`，返回 outcome=hired 的 CandidateJobLink 列表，join Candidate 和 Job 信息，附带 onboard 活动的 start_date。

前端渲染为表格：候选人姓名、入职岗位、入职日期、入职天数、来源。支持搜索姓名。

### 5. 人才库限制

人才库"推荐到岗位"按钮：如果候选人当前有 outcome=hired 的 link，隐藏推荐按钮，显示"已入职"标签。

### 6. hire-overlay 删除

hire 确认弹窗不再需要。所有入职确认通过 onboard 活动表单完成（使用 openDialog 渲染）。

## File Changes

### 后端
- `app/routes/activities.py` — CHAIN_TYPES 加 "onboard"，STAGE_LABEL 加映射，create 端点支持 onboard 类型
- `app/routes/pipeline.py` — 新增 `GET /api/pipeline/hired` 端点
- `app/models.py` — 无变更（复用现有字段）

### 前端
- `static/app.js`:
  - 新增 `renderOnboardFormHTML()` / `getOnboardFormData()` / `bindOnboardFormInteractivity()`
  - 修改 `renderNextStep()`：offer 接受后显示 onboard 表单（不再调用 openHireOverlay）
  - 修改 offer 表单保存：conclusion="拒绝" 时自动 reject
  - 新增 `renderHiredPage(el)` 函数
  - 修改 `router()` 新增 `#/hired` 路由
  - 删除 `openHireOverlay` 函数
  - 人才库推荐按钮增加已入职判断
- `static/index.html` — 导航栏新增"已入职"链接
- `static/style.css` — 已入职页面复用现有 table/card 样式，无需新增

## API Changes

### 新增
- `GET /api/pipeline/hired` — 返回已入职候选人列表
  - Response: `[{id, candidate_id, candidate_name, job_id, job_title, hired_at, start_date, source}]`

### 修改
- `POST /api/activities` — 支持 type="onboard"，保存后自动设置 link outcome=hired
