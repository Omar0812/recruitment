## Context

项目中存在两套 UTC 时间生成方式：
1. `app/utils/time.py` 的 `utc_now()` — 返回 **naive** datetime（`.replace(tzinfo=None)`），被 `deps.py`、`auth.py`、`biz_day_bounds_utc_naive`、`biz_week_start_utc_naive` 调用
2. `app/models/legacy.py` 的 `_utc_now()` — 返回 **aware** datetime，被所有旧模型的 `created_at`/`updated_at` default 使用
3. `app/models/base.py` 的 `TimestampMixin` — 返回 **aware** datetime（`lambda: datetime.now(timezone.utc)`）
4. `app/engine/actions/` 下 3 个文件各自定义 `_now()` — 返回 **aware** datetime

`deps.py` 第 47 行用 `.replace(tzinfo=None)` 把 aware 的 `expires_at` 转成 naive 再和 naive 的 `utc_now()` 比较，是创可贴代码。

前端 12+ 个组件各自手搓日期格式化，格式不统一（`MM-DD`、`M/D HH:mm` 不补零、`YYYY-MM-DD` 等混用），无公共工具函数。

## Goals / Non-Goals

**Goals:**
- 后端统一为 aware UTC datetime：`utc_now()` 返回 aware，删除所有 naive 兼容代码
- 引擎层 3 个 `_now()` 改为调用 `utc_now()`，消除重复定义
- `biz_day_bounds_utc_naive` 和 `biz_week_start_utc_naive` 改为返回 aware datetime，函数重命名去掉 `_naive` 后缀
- 前端新建 `utils/date.ts` 统一格式化出口，12 个组件替换为统一调用

**Non-Goals:**
- 不改数据库存储格式（SQLite 列定义 `DateTime(timezone=True)` 不变）
- 不改 API 序列化格式（仍然输出 ISO8601 `Z` 后缀）
- 不改前端时区转换逻辑（浏览器本地时区自动处理）
- 不改 `useAnalytics.ts` 的 `BIZ_DATE_FORMATTER`（Intl.DateTimeFormat 用于数据分析的日期范围计算，不是展示格式化）

## Decisions

### D1: `utc_now()` 直接改返回值，不新建函数

**选择**：修改 `utc_now()` 去掉 `.replace(tzinfo=None)`，返回 `datetime.now(timezone.utc)`
**替代方案**：新建 `utc_now_aware()` 逐步迁移 → 增加认知负担，两个函数并存更容易混淆
**理由**：调用点只有 4 处（`deps.py`、`auth.py`、`time.py` 自身 2 处），全局替换风险可控

### D2: `biz_day_bounds` / `biz_week_start` 改为返回 aware datetime

**选择**：函数重命名为 `biz_day_bounds_utc` / `biz_week_start_utc`，返回值去掉 `.replace(tzinfo=None)`，参数类型从 `reference_utc_naive` 改为 `reference_utc`
**理由**：这两个函数内部已经用 `ensure_utc_aware()` 转换，最后又 `.replace(tzinfo=None)` 转回 naive，纯属多余。改完后调用链全程 aware，不再有 naive/aware 转换

### D3: 引擎层 `_now()` 统一调用 `utc_now()`

**选择**：删除 `application_lifecycle.py`、`event_record.py`、`application_advance.py` 中各自的 `_now()` 定义，改为 `from app.utils.time import utc_now`
**理由**：消除 4 处重复的 `datetime.now(timezone.utc)` 定义，统一入口

### D4: 前端 `utils/date.ts` 提供 5 个函数

**选择**：新建 `frontend/src/utils/date.ts`，导出 5 个纯函数：

```typescript
// 完整时间戳：2025-03-19 14:30
export function formatDateTime(iso: string | null | undefined): string

// 纯日期：2025-03-19
export function formatDate(iso: string | null | undefined): string

// 紧凑日期：03-19
export function formatShortDate(iso: string | null | undefined): string

// 纯时间：14:30
export function formatTime(iso: string | null | undefined): string

// 日期+周几：2025-03-19 周三
export function formatDateWithWeekday(date?: Date): string
```

所有函数接收 ISO8601 字符串（或 null/undefined），返回格式化字符串。null/undefined 返回空字符串 `''`。
内部统一用 `new Date(iso)` 解析（浏览器自动转本地时区），手动拼接格式化字符串（不依赖第三方库）。

**替代方案**：引入 dayjs/date-fns → 项目无此依赖，为 5 个简单函数引入库不值得

### D5: HiredView 入职日期改为带年份

**选择**：从 `MM-DD入职` 改为 `YYYY-MM-DD 入职`
**理由**：跨年时 `MM-DD` 有歧义，HR 无法区分是今年还是去年入职的

## Risks / Trade-offs

**[R1] `utc_now()` 返回值变更影响 SQLite 存储** → 低风险。SQLite 列定义为 `DateTime(timezone=True)`，SQLAlchemy 会正确处理 aware datetime 的存储和读取。且 `legacy.py` 的 `_utc_now()` 和 `TimestampMixin` 已经在存 aware datetime，证明 SQLite 层面没问题。

**[R2] `biz_day_bounds` 调用方需要同步改** → 需排查。搜索结果显示这两个函数只在 `time.py` 内部被定义，需确认外部调用点（briefing.py 等）并同步更新变量名和类型期望。

**[R3] 前端 12 个文件批量改动** → 低风险。纯展示层替换，每个文件改动模式相同（删手搓逻辑 → import 工具函数 → 调用），不涉及业务逻辑。

**[R4] `OverviewTab.vue` 和 `ChannelList.vue` 中的 `toISOString().slice(0,10)`** → 这些是用于 API 请求参数的日期字符串拼接，不是展示格式化，不在本次改动范围内。
