# 进行中（Pipeline）

> 操作主战场。展示所有 IN_PROGRESS 的 Application，通过动作引擎推进阶段、记录事件、结束流程。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/pipeline/active` | 所有 IN_PROGRESS Application（分页，后端默认 page_size=20，前端覆盖为 100）。响应直接包含 candidate_name、job_title（join 查询），前端无需再逐个请求候选人和岗位详情 |
| GET | `/pipeline/event-summaries` | 批量事件摘要（query: application_ids=1,2,3）。一次返回多个 Application 的事件摘要，替代逐个 fetchEvents 的 N+1 查询 |
| GET | `/events?application_id={id}` | Application 事件列表（occurred_at DESC） |
| PUT | `/events/{id}` | 编辑 Event 的 payload/body |
| GET | `/actions/available?target_type=application&target_id={id}` | 当前可执行的 action 列表 |
| POST | `/actions/execute` | 统一动作入口（所有写操作走这里）。响应 event_ids 包含本次新创建的事件 ID 列表（edit/delete/幂等回放返回空列表） |
| GET | `/candidates/{id}` | 获取候选人信息（行展示用） |
| GET | `/jobs/{id}` | 获取岗位信息（行展示用） |

## 动作引擎

统一入口 `POST /actions/execute`，流程：幂等检查 → guard → handler → stage 派生 → receipt。

### action_code 清单（Pipeline 相关 12 个）

**阶段推进类（5）**：

| action_code | EventType | guard 前置条件 | 说明 |
|-------------|-----------|---------------|------|
| `pass_screening` | SCREENING_PASSED | IN_PROGRESS | 通过筛选 → 进入面试 |
| `advance_to_offer` | ADVANCE_TO_OFFER | IN_PROGRESS + 有 SCREENING_PASSED + 最新面评 conclusion=="pass" | 通过面试 → 进入 Offer |
| `start_background_check` | START_BACKGROUND_CHECK | IN_PROGRESS + 有 ADVANCE_TO_OFFER | 开始背调 |
| `record_offer` | OFFER_RECORDED | IN_PROGRESS + 有 ADVANCE_TO_OFFER + 最新背调 result=="pass" | 记录 Offer → 待入职 |
| `confirm_hire` | HIRE_CONFIRMED | IN_PROGRESS + 有 OFFER_RECORDED | 确认入职（state→HIRED）。自动计算 `hire_date = min(offer.onboard_date, 今天)`，存入 Event payload: {hire_date}。此 hire_date 为全系统入职日期唯一来源 |

**阶段内记录类（3）**：

| action_code | EventType | guard 前置条件 | 说明 |
|-------------|-----------|---------------|------|
| `schedule_interview` | INTERVIEW_SCHEDULED | IN_PROGRESS + 有 SCREENING_PASSED | payload: scheduled_at, interviewer, meeting_type |
| `record_interview_feedback` | INTERVIEW_FEEDBACK | IN_PROGRESS + 有 SCREENING_PASSED + 有 INTERVIEW_SCHEDULED | payload: conclusion(pass/fail), score, body |
| `record_background_check_result` | BACKGROUND_CHECK_RESULT | IN_PROGRESS + 有 START_BACKGROUND_CHECK | payload: result(pass/fail) |

**生命周期类（2）**：

| action_code | EventType | guard 前置条件 | 说明 |
|-------------|-----------|---------------|------|
| `end_application` | APPLICATION_ENDED | IN_PROGRESS | payload: outcome(rejected/withdrawn), reason, body |
| `record_left` | LEFT_RECORDED | HIRED（非 IN_PROGRESS） | 标记离职（state→LEFT） |

**事件修改类（2）**：

| action_code | guard 前置条件 | 说明 |
|-------------|---------------|------|
| `edit_event` | IN_PROGRESS | 修改 Event 的 payload/body，写 audit_log。结论字段（conclusion/result/outcome）在后续有依赖事件时前端禁用编辑 |
| `delete_event` | IN_PROGRESS + 必须是尾部 Event + 首条不可删 | 删除尾部 Event，阶段自动回退 |

## Stage 派生

6 种推进 EventType 映射 6 个 Stage，取时间线最后一个推进类 Event 决定当前 Stage：

| EventType | Stage |
|-----------|-------|
| APPLICATION_CREATED | 简历筛选 |
| SCREENING_PASSED | 面试 |
| ADVANCE_TO_OFFER | Offer沟通 |
| START_BACKGROUND_CHECK | 背调 |
| OFFER_RECORDED | 待入职 |
| HIRE_CONFIRMED | 已入职 |

## 页面

路由 `/pipeline`，组件 `PipelineView.vue`

**组件树**：
```
PipelineView         列表 + 分组视图切换（全部/按岗位/按阶段）
├── PipelineRow      行 header：▸候选人名 [阶段] 岗位名 面试时间
│   └── ExpandedRow  展开区：点击行展开
│       ├── EventTimeline → EventCard×N   事件时间线（● 类型 结论 YYYY-MM-DD HH:mm 摘要 [...]）
│       ├── StageAction                   阶段感知操作按钮（动态）
│       │   └── InterviewForm / FeedbackForm / OfferForm / BackgroundCheckForm
│       ├── ComposerInput                 备注输入（Enter 发送 add_note）
│       └── EndFlowPanel                  结束流程（未通过/候选人退出 + 原因选择）
```

**分组视图**：全部（无分组）/ 按岗位（job.title 分组）/ 按阶段（STAGE_ORDER 排序分组）。分组 header 可折叠。

**行 header 信息**：候选人名（可点击打开面板）+ 阶段标签（面试阶段细化为「一面安排中」「二面通过」等）+ 岗位名 + 面试时间（今天/明天/`YYYY-MM-DD HH:mm`）。

**阶段感知操作按钮**：

| 阶段 | 按钮 |
|------|------|
| 简历筛选 | [通过，安排面试] |
| 面试（无面试） | [安排面试] |
| 面试（待面评） | [填写面评] |
| 面试（面评通过） | [安排面试] [通过，发起 Offer] |
| Offer沟通 | [开始背调] |
| 背调 | [记录背调结果] [记录 Offer 方案] |
| 待入职 | [确认入职] |

## 业务规则

- **ApplicationState 转换**：IN_PROGRESS→HIRED（confirm_hire）、IN_PROGRESS→REJECTED（end_application outcome=rejected 或 close_job 级联）、IN_PROGRESS→WITHDRAWN（end_application outcome=withdrawn）、HIRED→LEFT（record_left）。其他转换不合法
- **关闭岗位级联**：close_job 级联淘汰时，每个 Application 的 state→REJECTED、outcome→`rejected`，并写入 APPLICATION_ENDED Event（payload: `{"outcome": "rejected", "reason": "岗位关闭"}`），确保时间线记录完整、stage 正确派生
- **面评二元化**：结论只有 pass/fail，无「待定」。未给结论则不写面评，流程停在当前阶段
- **结论中文映射**：EventCard 时间线展示时，面评结论 pass→通过 / reject→淘汰，背调结果 pass→通过 / fail→未通过（存储值不变，仅展示映射）
- **淘汰自动触发结束**：FeedbackForm 结论「淘汰」→ 展开结束原因选择 → 确认后 end_application(REJECTED)。BackgroundCheckForm「不通过」同理
- **淘汰原因校验**：FeedbackForm 淘汰原因选「其他」时，具体原因为必填，未填写时显示红色提示「请填写具体淘汰原因」且确认按钮禁用
- **结束流程交互**：EndFlowPanel 两个 Tab（未通过/候选人退出），选原因（预设列表+其他）→ 确认 → 服务器确认成功后从列表移除 + Toast 5 秒可撤回；失败时卡片不移除，toast 显示错误原因
- **结束撤回**：5 秒内可撤回，撤回逻辑为逐个 delete_event 删除结束产生的 Event。后端 POST /actions/execute 返回 event_ids 供前端撤回使用
- **Event 编辑**：任意 Event 可编辑 payload/body。有结构化字段的用对应表单编辑，无结构化字段的编辑 body（textarea）
- **Event 编辑菜单**：每条 Event 右侧常显 `[...]` 按钮（右对齐），点击弹出菜单（编辑/删除），点击菜单外任意位置关闭
- **Event 编辑权限**：字段分两类——数据字段（不影响流程走向）随时可编辑；结论字段（决定流程推进）在后续已有依赖事件时禁用并提示「请先删除后续记录再修改」。结论字段仅 3 个：`interview_feedback.conclusion`（后续依赖 `advance_to_offer`）、`background_check_result.result`（后续依赖 `offer_recorded`）、`application_ended.outcome`（通常为尾部事件，一般可编辑）
- **Event 可编辑字段映射（EDIT_FIELDS_MAP）**：覆盖全部 12 种事件类型，详见下方映射表
- **Event 删除**：只能删尾部 Event，首条（application_created）不可删。删除后 stage 自动重新派生
- **URL 展开**：`?expand={applicationId}` 自动展开该行并滚动到视区
- **幂等**：command_id 唯一索引，重复请求返回已有 receipt
- **Composer**：纯文本输入，Enter 发送，调用 `add_note` action 创建 NOTE 类型 Event。发送流程为「先调 API → 成功后清空输入框」；失败时保留输入内容，toast 提示错误
- **操作失败反馈**：所有前端 action 调用（推进阶段、记录事件、结束流程、写备注）失败时，统一 toast 显示后端返回的中文错误信息（如「需要先完成面评」），3 秒后自动消失。错误处理集中在 doAction 层，各组件失败时保留当前 UI 状态（表单不关闭、面板不收起、输入不清空）

## 与其他模块的交互

- **候选人面板**：点击候选人名字 / [查看完整档案] → 打开右侧面板
- **新建候选人**：关联岗位后跳转 `/pipeline?expand={applicationId}`
- **岗位页**：岗位面板候选人 Tab → 点击名字打开候选人面板 → [去进行中] → 跳转本页
- **渠道页**：ExpandedRow 按需加载候选人关联的猎头信息（Supplier），用于 OfferForm 猎头费字段
- **今日简报**：待办/日程链接跳转本页并展开对应行

## Event 可编辑字段映射表

| 事件类型 | payload 字段 | 控件 | 数据/结论 |
|---------|-------------|------|----------|
| interview_scheduled | `scheduled_at` 面试时间 | datetime（30 分钟档下拉） | 数据 |
| | `interviewer` 面试官 | text | 数据 |
| | `meeting_type` 面试形式 | select（现场/视频/电话） | 数据 |
| interview_feedback | `conclusion` 结论 | select（通过/淘汰），value 存英文 pass/reject | ⚠ 结论 |
| | `score` 评分 | 4 档按钮（1淘汰红/2一般橙/3良好蓝/4优秀绿） | 数据 |
| background_check_result | `result` 背调结果 | select（通过/未通过），value 存英文 pass/fail | ⚠ 结论 |
| offer_recorded | `monthly_salary` 现金月薪 | number | 数据 |
| | `salary_months` 发薪月数 | number | 数据 |
| | `total_cash` 现金总包 | number（自动计算，不可编辑） | 数据 |
| | `onboard_date` 入职日期 | date | 数据 |
| | `equity_package` 期权总包 | number | 数据 |
| | `total_package` 全部总包 | number（自动计算，不可编辑） | 数据 |
| | `headhunter_fee` 猎头费 | number | 数据 |
| application_ended | `outcome` 结束原因 | select（淘汰/退出），value 存英文 rejected/withdrawn | ⚠ 结论 |
| | `reason` 具体原因 | text | 数据 |
| application_created | body | textarea | 数据 |
| screening_passed | body | textarea | 数据 |
| advance_to_offer | body | textarea | 数据 |
| start_background_check | body | textarea | 数据 |
| hire_confirmed | body | textarea | 数据 |
| left_recorded | body | textarea | 数据 |
| note | body | textarea | 数据 |

所有事件类型都至少可编辑 body。有结构化字段的额外显示对应控件 + body textarea。

### 评分控件规格

4 档按钮横排，点选互斥：

| 档位 | 含义 | 选中底色 |
|------|------|---------|
| 1 | 淘汰 | 红色 |
| 2 | 通过，一般 | 橙色 |
| 3 | 通过，良好 | 蓝色（主色） |
| 4 | 通过，优秀 | 绿色 |

未选中：灰底灰字。选中：对应色底白字。悬停：tooltip 浮出含义文字。
新建面评（FeedbackForm）和编辑面评（EventCard 编辑模式）共用此控件。
旧 5 分数据编辑时显示为空（不预选），HR 需重新选择。

### 面试时间选择器规格

`scheduled_at` 用日期 + 时间下拉组合。时间部分为 30 分钟一档（00:00 / 00:30 / 01:00 ... 23:30），不允许任意分钟。新建面试（InterviewForm）和编辑面试时间（EventCard 编辑模式）共用此规格。

## ⚠️ spec 与代码差异

- ~~**面评编辑值不一致**~~：已确认 EDIT_FIELDS_MAP 中 select options 的 value 存英文（pass/reject），展示用中文 label，与 guard 一致。无差异
- ~~**背调编辑值同理**~~：同上，value 存英文（pass/fail），无差异
- **Composer 无 AI**：spec 描述「自然语言→Event」，代码中 ComposerInput 直接调 add_note，没有 AI 解析/分类逻辑。Composer 就是一个备注输入框
- **阶段感知主操作**：spec 要求「一个按钮」，代码中面试阶段和背调阶段可同时显示多个按钮（如面试通过后显示 [安排面试] + [通过，发起 Offer]）
