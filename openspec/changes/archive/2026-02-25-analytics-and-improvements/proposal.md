## Why

系统缺少数据分析视图、候选人可同时存在多个活跃流程导致数据混乱、多处 P0/P1 Bug 影响数据可靠性、表单无输入验证导致脏数据入库。这些问题共同影响 HR 的日常使用体验和数据可信度。

## What Changes

- **新增数据分析页面**（`#/analytics`）：招聘漏斗、岗位维度汇总、候选人来源分布、淘汰原因分布
- **单活跃流程限制**：候选人同一时间只能有一个活跃 link，投递新岗位时若已有活跃流程则直接拦截并提示
- **修复 `GET /api/candidates/{id}` 不过滤软删除**：已合并删除的候选人详情页应返回 404
- **修复编辑候选人信息不写历史记录**：`PATCH /api/candidates/{id}` 修改信息后补写 HistoryEntry
- **修复 API 静默失败**：前端 api helper 补充错误处理，请求失败时显示错误提示
- **修复快速双击重复提交**：保存按钮点击后立即 disabled，请求完成后恢复
- **新增表单输入验证**：手机号（11位数字）、邮箱格式、年龄（1-100）、工作年限（0-50）

## Capabilities

### New Capabilities
- `analytics-dashboard`: 数据分析页面，展示招聘漏斗、岗位汇总、来源分布、淘汰原因分布
- `single-active-pipeline`: 候选人单活跃流程限制，投递时检查并拦截
- `form-validation`: 前端表单输入验证（手机/邮箱/年龄/工作年限）
- `api-error-handling`: 前端 API 请求统一错误处理和防重复提交

### Modified Capabilities
- `pipeline-data-integrity`: 补充单活跃流程后端拦截逻辑
- `candidate-profile`: `GET /api/candidates/{id}` 过滤软删除；`PATCH` 补写历史记录

## Impact

- **后端**：`app/routes/candidates.py`（get_candidate、patch_candidate）、`app/routes/pipeline.py`（link_candidate）
- **前端**：`static/app.js`（api helper、所有表单保存按钮、新增 renderAnalytics 函数）
- **导航**：`static/index.html` 新增"数据分析"导航项
- **无数据库变更**：复用现有数据，纯查询聚合
