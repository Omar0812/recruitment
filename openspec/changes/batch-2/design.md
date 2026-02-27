## Context

当前系统有 `app/routes/insights.py` 占位文件（空路由），`app/routes/context.py` 已有 `_build_alerts` 逻辑可复用。前端 `app.js` 3267 行单文件，所有页面渲染函数都在其中。导航栏和路由在文件顶部。

## Goals / Non-Goals

**Goals:**
- 实现 `/api/insights/today` 接口，返回按优先级分组的待办项列表
- 实现今日待办前端页面（`#/today` 路由），作为新默认主页
- 重构「进行中」展开区 `renderExpandInner`，按活动状态动态渲染

**Non-Goals:**
- 前端模块化拆分（Batch 6 的事）
- Alpine.js 引入（暂不引入，Vanilla JS 可以处理当前复杂度）
- 招聘周报生成（Batch 4 的事）

## Decisions

### 决策1：insights/today API 的数据结构

每个待办项返回足够前端渲染卡片的字段，不需要前端再发请求：

```json
{
  "today": [
    {
      "priority": "P0",
      "type": "interview_today",
      "link_id": 12,
      "candidate_name": "王小明",
      "job_title": "高级前端工程师",
      "stage": "二面",
      "scheduled_at": "2026-02-27T07:00:00",
      "interviewer": "张总",
      "location": "线上",
      "activity_id": 45,
      "last_interview_summary": {
        "round": "一面",
        "score": 4,
        "conclusion": "通过",
        "comment": "技术扎实"
      }
    },
    {
      "priority": "P0",
      "type": "offer_waiting",
      "link_id": 8,
      "candidate_name": "李四",
      "job_title": "产品经理",
      "activity_id": 32,
      "offer_days": 6,
      "offer_created_at": "2026-02-21T03:00:00",
      "monthly_salary": 25000
    },
    {
      "priority": "P1",
      "type": "interview_feedback_missing",
      "link_id": 15,
      "candidate_name": "张三",
      "job_title": "运营总监",
      "activity_id": 28,
      "stage": "一面",
      "days_missing": 3,
      "scheduled_at": "2026-02-24T06:00:00"
    },
    {
      "priority": "P1",
      "type": "pipeline_stale",
      "link_id": 20,
      "candidate_name": "赵六",
      "job_title": "销售总监",
      "stage": "简历筛选",
      "days_stale": 15,
      "last_updated": "2026-02-12T00:00:00"
    },
    {
      "priority": "P2",
      "type": "unassigned_candidates",
      "candidates": [
        {"id": 5, "name": "陈七", "created_at": "2026-02-25T00:00:00"},
        {"id": 6, "name": "林八", "created_at": "2026-02-24T00:00:00"}
      ]
    }
  ],
  "week_summary": {
    "in_progress": 12,
    "interviews_this_week": 3,
    "offers_pending": 2,
    "hired_this_week": 1
  }
}
```

备选方案：前端按需 fetch 每个候选人详情 → 拒绝，N+1 问题且今日待办面试卡片需要"上轮面评"，要额外查询。

### 决策2：面试时间判断逻辑

- `interview_today`：`scheduled_at` 在今天（本地时间）
- `interview_tomorrow`：`scheduled_at` 在明天（也归入 P0）
- `interview_feedback_missing`：`status='scheduled'` 且 `scheduled_at < now - 2days`
  - 判断依据：scheduled_at 已过，但没有后续 status='completed' 的记录（即同一个 activity 仍是 scheduled）

### 决策3：进行中展开区状态判断

`renderExpandInner` 按 tail activity 状态分支：

```
tail == null                          → 状态D（简历筛选待处理，不应出现）
tail.type == 'resume_review'
  && !complete                        → 状态D（简历筛选内联表单）
tail.type == 'interview'
  && status == 'scheduled'
  && scheduled_at > now               → 状态A（面试未到时间）
tail.type == 'interview'
  && status == 'scheduled'
  && scheduled_at <= now              → 状态B（面评表单自动展开）
tail.type == 'interview'
  && status == 'completed'            → 状态C（活动完成，显示下一步选项）
tail.type == 'offer' && !complete     → Offer 进行中（同状态A逻辑，等候选人回复）
tail.type == 'offer' && complete      → 状态C
tail.type == 'background_check'       → 参照面试逻辑
tail.type == 'onboard'                → 不会出现（onboard 创建即 hired，已从进行中移除）
```

### 决策4：下一步节点选项过滤规则

```
当前 tail 类型        → 可用的下一步节点
resume_review (完成)  → [安排面试]
interview (完成)      → [安排面试, 发Offer, 安排背调]
offer (完成/接受)     → [安排背调, 确认入职]
background_check(完成)→ [确认入职]
```

节点按钮点击后在展开区内渲染对应新建表单（不弹窗，内联展开）。

### 决策5：今日待办操作完成后的 UX

操作完成 → 卡片显示「✓ 已完成」绿色状态 → 1.5 秒后淡出消失 → 无需整页刷新，仅移除该 DOM 节点。

### 决策6：`unassigned_candidates` 的聚合方式

多个未分配候选人合并为一张卡片（P2），展开后逐条显示，每条有独立「分配岗位」按钮。单独一张卡，不是多张，避免 P2 区域被大量未分配候选人淹没。

## Risks / Trade-offs

- **时区问题**：`scheduled_at` 存 UTC，判断"今天有面试"需转换为本地时间。后端用 `datetime.now()`（本地时间）或前端做转换。→ 选择后端统一处理，返回时间字符串，前端仅显示。
- **insights API 性能**：多个独立查询（面试、Offer、停滞、未分配）。当前数据量小，不做优化；未来如有性能问题可加缓存或合并查询。
- **renderExpandInner 重构风险**：现有逻辑复杂，重构需保证状态D（简历筛选）的现有行为不变。→ 新增状态分支，不删除旧逻辑，逐步替换。
