## Why

项目中 `utc_now()` 返回 naive UTC datetime，而模型层 `TimestampMixin` 和引擎层 `_now()` 返回 aware UTC datetime，两种格式混用。Python 规定 naive 和 aware datetime 不能直接比较，目前靠 `deps.py` 的 `.replace(tzinfo=None)` 创可贴兜着没出事，但未来任何新代码忘了贴创可贴就会崩溃。同时前端 12+ 个组件各自手搓日期格式化逻辑，格式不统一（`MM-DD`、`M/D HH:mm` 不补零、`YYYY-MM-DD` 等混用），改格式要改十几个文件。

## What Changes

**后端：**
- **BREAKING**：`app/utils/time.py` 的 `utc_now()` 从返回 naive datetime 改为返回 aware datetime（`datetime.now(timezone.utc)`，去掉 `.replace(tzinfo=None)`）
- 删除 `app/entry/deps.py` 中 `token_record.expires_at.replace(tzinfo=None)` 兼容代码
- 全局排查所有 `utc_now()` 调用点，确认与 aware datetime 兼容（无 naive vs aware 比较）

**前端：**
- 新建 `frontend/src/utils/date.ts`，提供 5 个格式化函数（`formatDateTime`、`formatDate`、`formatShortDate`、`formatTime`、`formatDateWithWeekday`）
- 12 个组件删除各自的手搓格式化逻辑，统一调用 `utils/date.ts`
- `HiredView.vue` 入职日期从 `MM-DD入职` 改为 `YYYY-MM-DD 入职`

## Capabilities

### New Capabilities
- `time-formatting`: 前端统一日期格式化工具库（`utils/date.ts`），提供 5 个格式化函数，所有组件统一调用

### Modified Capabilities
（无现有 spec 需要修改——后端 `utc_now()` 改动属于实现细节，不涉及 spec 级别的行为变更）

## Impact

**后端文件：**
- `app/utils/time.py` — `utc_now()` 返回值类型变更（naive → aware）
- `app/entry/deps.py` — 删除兼容代码
- 所有调用 `utc_now()` 的文件 — 需逐个确认兼容性

**前端文件（12 个组件 + 1 个新文件）：**
- 新建：`frontend/src/utils/date.ts`
- 改动：`EventCard.vue`、`PipelineRow.vue`、`BriefingSchedule.vue`、`BriefingView.vue`、`HiredView.vue`、`BasicInfoTab.vue`（job-panel）、`ResumeTab.vue`、`CandidatePanel.vue`、`ApplicationRecord.vue`、`JobCard.vue`、`CandidateCard.vue`、`useAnalytics.ts`

**文档：**
- `docs/standards.md` — 已标注变更（后端 aware UTC + 前端格式规范）
- 6 个模块 contract — 已标注变更

**风险：**
- 后端 aware 改动影响面广，需全局排查确认无 naive vs aware 比较
- 前端改动量大但风险低，纯展示层替换
