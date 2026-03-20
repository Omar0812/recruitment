## ADDED Requirements

### Requirement: 后端统一使用 aware UTC datetime

系统 SHALL 在所有后端代码中统一使用 timezone-aware UTC datetime。

- `utc_now()` SHALL 返回 `datetime.now(timezone.utc)`（aware），不得 `.replace(tzinfo=None)`
- 所有需要当前 UTC 时间的代码 SHALL 调用 `utc_now()`，不得自行定义 `_now()` 或直接调用 `datetime.now(timezone.utc)`
- `biz_day_bounds_utc` 和 `biz_week_start_utc` SHALL 返回 aware UTC datetime，不得在返回前 `.replace(tzinfo=None)`
- 不得存在将 aware datetime 转为 naive datetime 的兼容代码（如 `expires_at.replace(tzinfo=None)`）

#### Scenario: utc_now 返回 aware datetime
- **WHEN** 任何代码调用 `utc_now()`
- **THEN** 返回值的 `tzinfo` 为 `timezone.utc`，不为 `None`

#### Scenario: deps.py token 过期比较使用 aware datetime
- **WHEN** `current_user` 依赖检查 token 是否过期
- **THEN** 直接比较 `token_record.expires_at` 和 `utc_now()`，无需 `.replace(tzinfo=None)` 转换

#### Scenario: auth.py 创建 token 使用 aware datetime
- **WHEN** `_create_token` 设置 `expires_at`
- **THEN** `expires_at` 为 `utc_now() + timedelta(days=N)`，值为 aware UTC datetime

#### Scenario: 引擎层使用统一的 utc_now
- **WHEN** `application_lifecycle.py`、`event_record.py`、`application_advance.py` 需要当前时间
- **THEN** 调用 `from app.utils.time import utc_now`，不自行定义 `_now()`

#### Scenario: biz_day_bounds 返回 aware datetime
- **WHEN** 调用 `biz_day_bounds_utc()`
- **THEN** 返回的 4 个 datetime 值均为 aware UTC datetime（`tzinfo == timezone.utc`）

#### Scenario: biz_week_start 返回 aware datetime
- **WHEN** 调用 `biz_week_start_utc()`
- **THEN** 返回值为 aware UTC datetime（`tzinfo == timezone.utc`）

---

### Requirement: 前端提供统一日期格式化工具库

系统 SHALL 在 `frontend/src/utils/date.ts` 提供统一的日期格式化函数，所有组件 SHALL 调用此工具库进行日期格式化，不得在组件内自行拼接日期字符串。

#### Scenario: formatDateTime 输出完整时间戳
- **WHEN** 调用 `formatDateTime("2025-03-19T06:30:00Z")`（浏览器时区为 Asia/Shanghai）
- **THEN** 返回 `"2025-03-19 14:30"`

#### Scenario: formatDate 输出纯日期
- **WHEN** 调用 `formatDate("2025-03-19T06:30:00Z")`（浏览器时区为 Asia/Shanghai）
- **THEN** 返回 `"2025-03-19"`

#### Scenario: formatShortDate 输出紧凑日期
- **WHEN** 调用 `formatShortDate("2025-03-19T06:30:00Z")`（浏览器时区为 Asia/Shanghai）
- **THEN** 返回 `"03-19"`

#### Scenario: formatTime 输出纯时间
- **WHEN** 调用 `formatTime("2025-03-19T06:30:00Z")`（浏览器时区为 Asia/Shanghai）
- **THEN** 返回 `"14:30"`

#### Scenario: formatDateWithWeekday 输出日期加周几
- **WHEN** 调用 `formatDateWithWeekday(new Date("2025-03-19T06:30:00Z"))`（浏览器时区为 Asia/Shanghai，周三）
- **THEN** 返回 `"2025-03-19 周三"`

#### Scenario: null 或 undefined 输入返回空字符串
- **WHEN** 调用任意格式化函数传入 `null` 或 `undefined`
- **THEN** 返回 `""`

---

### Requirement: 各组件使用统一格式化函数

以下组件 SHALL 删除各自的手搓日期格式化逻辑，改为调用 `utils/date.ts` 对应函数：

| 组件 | 原格式 | 改用函数 |
|------|--------|---------|
| `EventCard.vue` — `formattedTime` | `MM-DD` | `formatDateTime` |
| `EventCard.vue` — 面试安排摘要 | `M/D HH:mm`（不补零） | `formatDateTime` |
| `PipelineRow.vue` — 面试时间 | `MM-DD HH:mm` | `formatDateTime` |
| `BriefingSchedule.vue` — 日程时间 | `HH:mm` | `formatTime` |
| `BriefingView.vue` — 页头日期 | `YYYY-MM-DD 周几` | `formatDateWithWeekday` |
| `HiredView.vue` — 入职日期 | `MM-DD入职` | `formatDate` + `入职` 后缀 |
| `BasicInfoTab.vue`（job-panel）— 目标到岗 | `YYYY-MM-DD` | `formatDate` |
| `ResumeTab.vue` — 简历创建日期 | `YYYY-MM-DD` | `formatDate` |
| `CandidatePanel.vue` — 担保期到期日 | `YYYY-MM-DD` | `formatDate` |
| `ApplicationRecord.vue` — 事件日期 | `MM-DD` | `formatShortDate` |
| `JobCard.vue` — 岗位日期 | `MM-DD` | `formatShortDate` |
| `CandidateCard.vue` — 卡片日期 | `MM-DD` | `formatShortDate` |
| `CandidateCard.vue` — 入职日期 | `MM-DD入职` | `formatShortDate` + `入职` 后缀 |

#### Scenario: EventCard 事件时间显示完整时间戳
- **WHEN** 事件时间线渲染 EventCard
- **THEN** `occurred_at` 显示为 `YYYY-MM-DD HH:mm` 格式（调用 `formatDateTime`）

#### Scenario: EventCard 面试安排摘要显示完整时间戳
- **WHEN** EventCard 渲染 `interview_scheduled` 类型事件的摘要
- **THEN** `scheduled_at` 显示为 `YYYY-MM-DD HH:mm` 格式（调用 `formatDateTime`），补零对齐

#### Scenario: PipelineRow 面试时间显示完整时间戳
- **WHEN** PipelineRow 行 header 显示面试时间
- **THEN** 非今天/明天的面试时间显示为 `YYYY-MM-DD HH:mm` 格式（调用 `formatDateTime`）

#### Scenario: BriefingSchedule 日程只显示时间
- **WHEN** 简报日程区渲染面试/入职时间
- **THEN** 显示为 `HH:mm` 格式（调用 `formatTime`）

#### Scenario: BriefingView 页头显示日期加周几
- **WHEN** 简报页头渲染当前日期
- **THEN** 显示为 `YYYY-MM-DD 周几` 格式（调用 `formatDateWithWeekday`）

#### Scenario: HiredView 入职日期带年份
- **WHEN** 已入职列表渲染入职日期
- **THEN** 显示为 `YYYY-MM-DD 入职` 格式（调用 `formatDate` + 后缀）

#### Scenario: BasicInfoTab 目标到岗日期
- **WHEN** 岗位面板基本信息 Tab 渲染目标到岗日期
- **THEN** 显示为 `YYYY-MM-DD` 格式（调用 `formatDate`）

#### Scenario: ResumeTab 简历创建日期
- **WHEN** 候选人面板简历 Tab 渲染简历创建日期
- **THEN** 显示为 `YYYY-MM-DD` 格式（调用 `formatDate`）

#### Scenario: ApplicationRecord 事件日期紧凑显示
- **WHEN** 候选人面板流程记录渲染事件日期
- **THEN** 显示为 `MM-DD` 格式（调用 `formatShortDate`）

#### Scenario: JobCard 岗位日期紧凑显示
- **WHEN** 岗位卡片渲染日期
- **THEN** 显示为 `MM-DD` 格式（调用 `formatShortDate`）

#### Scenario: CandidateCard 卡片日期紧凑显示
- **WHEN** 人才库候选人卡片渲染日期
- **THEN** 显示为 `MM-DD` 格式（调用 `formatShortDate`）
