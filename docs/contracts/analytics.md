# 数据分析（Analytics）

> 纯只读模块。三级钻取（总览→岗位/渠道列表→单个详情），cohort 漏斗 + 趋势柱状图 + 粒度切换。

## 接口

所有 endpoint 必传 `start` 和 `end`（ISO date 字符串），后端转 UTC datetime 边界。

| 方法 | 路径 | 额外参数 | 返回值 |
|------|------|---------|--------|
| GET | `/analytics/overview` | `granularity`(day/week/month/quarter) | cards, trend, funnel, funnel_cohort_size, end_reasons |
| GET | `/analytics/jobs` | `filter`(open/closed/all) | items, totals |
| GET | `/analytics/jobs/{id}` | 无 | job, funnel, funnel_cohort_size, stage_durations, source_distribution, end_reasons |
| GET | `/analytics/channels` | 无 | sections（三组：猎头/招聘平台/其他） |
| GET | `/analytics/channels/{key}` | 无 | channel, funnel, funnel_cohort_size, end_reasons, job_distribution, expense_detail |

**渠道 key 格式**：`supplier:{id}` / `source_tag:{term_id}` / `referral` / `other`

## 页面

路由 `/analytics`，组件 `AnalyticsView.vue`

```
AnalyticsView
├── TimePicker              时间选择器（预设/自定义/翻页）
├── TabBar                  三 tab：总览 / 岗位 / 渠道
├── OverviewTab             总览
│   ├── StatCards            6 个数字卡片 + 环比
│   ├── TrendChart           全宽柱状图（标题含日期范围 + 粒度切换）
│   ├── FunnelChart          累计漏斗
│   └── EndReasons           结束原因（未通过/候选人退出）
├── JobsTab                  岗位分析
│   ├── JobList              岗位列表（含合计行 + open/closed 筛选）
│   └── JobDrilldown         岗位详情（漏斗 + 阶段耗时 + 来源分布 + 结束原因）
└── ChannelsTab              渠道分析
    ├── ChannelList           渠道列表（三 section）
    └── ChannelDrilldown      渠道详情（漏斗 + 结束原因 + 岗位分布 + 费用明细）
```

**共享组件**：FunnelChart 和 EndReasons 被三个视图复用。

## 聚合口径

### 数字卡片（6 个 + 环比）

| 指标 | 计数口径 |
|------|---------|
| 新建档 | Candidate.created_at 在范围内，排除 deleted_at 和 merged_into 非空 |
| 新流程 | Application.created_at 在范围内 |
| 入职 | HIRE_CONFIRMED 事件 payload.hire_date 在范围内，按 application_id 去重 |
| 结束 | APPLICATION_ENDED 事件 occurred_at 在范围内，按 application_id 去重 |
| 平均周期 | 本期入职者的 (hire_confirmed.payload.hire_date - application.created_at).days 平均值，过滤掉 hire_date < created_at 的记录（回填数据导致负值，不反映真实招聘周期） |
| 总费用 | Expense.occurred_at 在范围内总额 + 猎头费（按 hire_date 归属） |

**环比**：取焦点范围等长的前一窗口，`(current - previous) / previous × 100`。

### 漏斗（Cohort 模式）

- **阶段序列**：简历筛选 → 面试 → Offer沟通 → 背调 → 待入职 → 已入职
- **Cohort 筛选**：Application.created_at 在焦点范围内
- **归位**：HIRED → 已入职；其他 → 取 app.stage，缺失回退到简历筛选
- **累计计数**：到达某阶段 = 该阶段及之前所有阶段都 +1
- **转化率**：第0阶段 = count/cohort_total；第i阶段 = count/上一阶段count（逐级转化率）

### 趋势图

**布局**：单张全宽柱状图，标题格式 `本期节奏 · M.D–M.D`，粒度切换 `按 [天][周]` 置于标题右侧。

**X 轴粒度**：day(ISO日期) / week(所属周一) / month(YYYY-MM) / quarter(YYYY-QN)

**Y 轴指标**：每桶两个值——`new_applications`(新建) + `hired`(入职)，每根柱子上方始终显示数值标签（包括 0）。

**粒度切换位置**：仅在趋势图标题旁，TimePicker 不再包含粒度切换。

**粒度约束**：

| 范围天数 | 可选粒度 | 默认 |
|---------|---------|------|
| ≤14 | day | day |
| 15-28 | day, week | week |
| 29-90 | week, month | week |
| 91-180 | week, month | month |
| 181-365 | month | month |
| >365 | month, quarter | quarter |

### 阶段耗时（仅岗位 drill-down）

按 Event 时间线重建阶段进出时间，只算已离开该阶段的候选人。输出每阶段的 avg_days + sample_size。

### 结束原因

二分类：未通过(REJECTED) / 候选人退出(WITHDRAWN)，从 APPLICATION_ENDED 事件的 payload.outcome + payload.reason 提取。

## 时间范围

| 预设 | 范围 |
|------|------|
| this_month | 本月1日 ~ 今天 |
| last_month | 上月1日 ~ 上月末 |
| this_quarter | 本季度首月1日 ~ 今天 |
| last_quarter | 上季度 |
| custom | 用户自选 |

前端用 Asia/Shanghai 时区确定「今天」。支持翻页（按范围天数整体平移，不超过今天）。

## 业务规则

- **纯只读**：不写入任何数据，所有数据从 Application/Event/Candidate/Job/Expense/Supplier 表聚合
- **猎头费按入职日期归属**：HIRE_CONFIRMED 事件 payload.hire_date 在焦点范围内的，取其 offer_recorded 的 payload.headhunter_fee
- **渠道归属**：Candidate.supplier_id 非空→猎头；referred_by 非空→内推；source 匹配 Term→对应 platform/other；无法识别→其他

## 与其他模块的交互

- **岗位页**：点击岗位名 → `router.push('/jobs', { panel: jobId })`
- **渠道页**：点击渠道名 → `router.push('/channels', ...)` 按 key 类型带不同 query
- **数据来源**：读取 Application/Event（进行中）、Candidate（新建候选人）、Job（岗位）、Supplier/Term（渠道）、Expense（费用）

## ⚠️ spec 与代码差异

- **通过率命名**：代码中 `pass_rate = cohort_hired_count / cohort_total × 100`，实际是 cohort 转化率而非面试通过率，命名可能误导 HR
