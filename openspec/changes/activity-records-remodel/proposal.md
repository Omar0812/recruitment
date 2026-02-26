## Why

当前 `interview_records` 表只能记录正式面试，候选人在简历筛选、电话初筛、Offer 沟通等阶段发生的事情完全没有载体，导致生命周期追踪割裂、数据分析盲区大。需要将 `interview_records` 重构为统一的 `activity_records` 表，覆盖全流程活动类型，同时修复时间选择器体验差、淘汰/退出原因选项不足等问题。

## What Changes

- **BREAKING** 新建 `activity_records` 表，迁移 `interview_records` 数据后删除旧表
- 活动类型支持：`interview`（面试）、`phone_screen`（电话初筛）、`note`（备注）、`offer`（Offer 沟通）
- 每条 activity 记录所属 `stage`（创建时锁定，不可修改）
- 阶段变更静默写入 `activity_records`（type=`stage_change`），HistoryEntry 保留为系统审计日志不再面向用户
- 进行中页时间轴按阶段分组渲染，展示完整生命周期
- 推进阶段合并"安排面试"入口：推进到新阶段时自动触发创建该阶段第一条活动记录的表单
- 同一阶段内可追加活动记录（"+ 添加"按钮），但不允许在已过去的阶段追加（单向道）
- 面试时间选择器改为日期 + 时间段下拉（15分钟步进，工作时间段）
- 淘汰原因选项扩充为三个维度（能力/意愿/流程），退出原因扩充为6个选项，均改为必选+选填补充说明
- 退出原因改为必选（从预设选项中选一个）

## Capabilities

### New Capabilities

- `activity-records`: 统一活动记录表，支持多类型、按阶段分组的候选人生命周期追踪
- `activity-timeline`: 进行中页和候选人详情流程 tab 的按阶段分组时间轴渲染
- `stage-advance-flow`: 推进阶段时合并创建活动记录的交互流程

### Modified Capabilities

- `interview-record`: 原面试记录能力被 activity-records 取代，字段和 API 全部重构
- `pipeline-tracking-page`: 展开行 UI 重构，时间轴按阶段分组，推进入口合并
- `rejection-reason`: 淘汰原因和退出原因选项扩充，退出原因改为必选

## Impact

- `app/models.py`: 新增 `ActivityRecord` 模型，废弃 `InterviewRecord`
- `app/server.py`: DB migration 新建 activity_records 表，迁移数据
- `app/routes/interviews.py`: 重构为 `app/routes/activities.py`，API 路径改为 `/api/activities`
- `app/routes/pipeline.py`: stage 推进时写入 stage_change activity
- `static/app.js`: 全面重构展开行、时间轴渲染、面试表单、原因选项
- `static/index.html`: 更新弹窗 DOM，扩充原因选项
