## Why

代码审查发现 13 个 bug，涵盖后端死代码、软删除过滤缺失、前端阶段硬编码、URL 编码错误等问题。这些问题在真实数据下会导致功能异常（简历下载 404、自定义阶段时间轴错乱、已删除候选人仍被计入统计），需要统一修复。

## What Changes

**后端（Python）**
- 删除 `candidates.py` `check_duplicate` 函数 return 后的死代码（第142-143行）
- `PATCH /api/candidates/{id}` 增加软删除过滤，已合并候选人不可被更新
- `jobs.py` `list_jobs` 的 `active_count` 过滤软删除候选人
- `GET /api/candidates` 搜索支持 `name_en` 字段

**前端（JavaScript）**
- 候选人详情"流程" tab 阶段列表改用岗位实际 `stages`，不再硬编码
- 下载简历 `href` 修复 `encodeURIComponent` 错误编码 `/` 的问题
- 人才库候选人名 `null` 安全处理（`c.name || c.name_en || "?"`)
- 删除面试记录改用 `api` helper（统一错误 toast）
- 流程跟进"填写面评"弹窗重置星星/结论视觉状态
- 删除 `renderExpandInner` 中错误的重绑定死代码
- 备注保存改用 `showToast()` 替代 `alert()`
- 岗位表单保存按钮加 `withLoading` 防重复提交

## Capabilities

### New Capabilities

（无新能力，全部为 bug 修复）

### Modified Capabilities

- `candidate-api`: 软删除过滤补全（PATCH 接口）、搜索支持英文名、死代码清理
- `job-api`: active_count 过滤软删除候选人
- `pipeline-stage-ui`: 候选人详情流程 tab 使用岗位真实阶段
- `frontend-ux`: 简历下载 URL、null 安全、面评弹窗重置、toast 统一、loading 防重复

## Impact

- `app/routes/candidates.py` — 死代码删除、PATCH 软删除过滤、搜索加 name_en
- `app/routes/jobs.py` — active_count 过滤软删除
- `static/app.js` — 多处前端 bug 修复（约 8 处改动）
- 无 API 合约变更，无数据库 schema 变更，无依赖新增
