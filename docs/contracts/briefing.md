# 今日简报（Briefing）

> Landing page，HR 打开系统第一眼看到的页面。不是仪表盘——是帮你筛选好的每日作战地图。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/briefing/today` | 返回当日简报数据（pulse + schedule + todos + focus） |

**返回结构**：
```
{
  pulse: { today_interviews, todo_count, active_applications, open_jobs }
  schedule: { today: ScheduleItem[], tomorrow: ScheduleItem[] }
  todos: TodoGroup[]
  focus: FocusItem[]
}
```

**ScheduleItem**：`type(interview|onboard), application_id, candidate_id/name, job_id/title, scheduled_at?, onboard_date?, interview_round?, interviewer?, meeting_type?`

**TodoGroup**：`type, label, items: TodoItem[], max_days`（组间按 max_days 倒序）

**FocusItem**：`entity(job|candidate), job_id/title, signals[], severity`；job 级含 `hired_count, headcount, department, priority`；候选人级含 `application_id, candidate_id/name, stage, days_silent`

## 页面

路由 `/`（默认首页），页面组件 `BriefingView.vue`

**四个板块自上而下**：
1. **脉搏行**（`BriefingPulse.vue`）：今日面试 N · 待办 N · 进行中 N · open 岗位 N。「进行中」→ `/pipeline`，「open 岗位」→ `/jobs`
2. **📅 日程**（`BriefingSchedule.vue`）：今日面试/入职 + 明天面试/入职，按时间升序。时间显示 `HH:mm`（调用 `utils/date.ts` 的 `formatTime`）。空态「今明两日暂无日程安排」
3. **📋 待办**（`BriefingTodos.vue`）：7 种类型（待分配/待筛选/待面评/待安排/待记录背调/待发Offer/待确认入职）。待分配和待筛选用聚合行（N 份 → 去处理），其余逐条展开。空态「全部处理完毕 ✓」
4. **👁 关注**（`BriefingFocus.vue`）：岗位级信号（无候选人/前段管道空/deadline 临近/招满待关闭）+ 候选人级信号（久未联系）。空态「一切正常」

**拖拽建档**：整个页面支持文件拖放 → `stashDroppedFiles()` → 跳转 `/candidate/create`

## 业务规则

- **数据源**：所有 IN_PROGRESS 的 Application（含 events/candidate/job joinedload），加 open 的 Job 和未分配 Candidate
- **业务日期基准**：「今天/明天」统一使用北京时间（BIZ_TZ = UTC+8）判断，不使用 UTC 日期。scheduled_at（UTC 时间戳）比较前先转为北京时间 date；onboard_date（纯日期）直接比较
- **日程触发条件**：面试 = INTERVIEW_SCHEDULED 且 scheduled_at 当天/明天且未有后续 INTERVIEW_FEEDBACK；入职 = OFFER_RECORDED 中 onboard_date 当天/明天且未 HIRE_CONFIRMED
- **去重规则**：日程中出现的 Application 不进待办；待办中出现的 Application 不进关注（实体互斥，岗位和候选人作为不同实体可共存）
- **待办排序**：组间 max_days 倒序（等最久的组排最上）；组内按岗位优先级（high→medium→low）→ 等待天数倒序
- **关注排序**：severity（无候选人+deadline=0 最高 → 招满待关闭=5 最低）→ 岗位优先级
- **久未联系**：仅 Offer沟通/待入职阶段，最近 Event > 7 天，且不在待办中的 Application
- **无候选人**：open 岗位开 > 7 天且活跃 Application = 0
- **空状态**：三个 section 始终可见，空了显示正向文字（简报页例外于宪法的空状态消失原则）

## 与其他模块的交互

- **进行中**：日程/待办点击 → `/pipeline?expand={application_id}`（展开对应行）
- **岗位页**：关注区岗位 → `/jobs?panel={job_id}`（打开岗位面板）；脉搏行 open 岗位 → `/jobs`
- **人才库**：待分配聚合行 → `/talent-pool?pipeline_status=none`
- **新建候选人**：拖拽文件 → `/candidate/create`（stashDroppedFiles 中转）

## ⚠️ spec 与代码差异

- **脉搏行可点击范围**：spec 写「今日面试/待办不可点」，代码中确实不可点（无 router.push），但「进行中」和「open 岗位」可点（spec 一致）
- **待筛选聚合行导航**：spec 写「待筛选 → 跳转进行中页面」，代码中待筛选聚合行 → `/pipeline`（一致，但无筛选参数）
