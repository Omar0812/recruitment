## Purpose
定义流程跟进页面的展示和交互规范，提供所有活跃候选人的统一分组视图。

## Requirements

### Requirement: 流程跟进页面展示所有活跃人选
系统 SHALL 提供流程跟进页面，以分组卡片形式展示所有当前在招聘流程中（outcome 为 NULL）的候选人。默认按岗位分组，支持切换为按阶段分组。每个分组为独立卡片，内部表格显示姓名、阶段（按岗位分组时）或岗位（按阶段分组时）、最后更新时间、快捷操作。stage 标签从活动链派生显示，后端自动维护。当转移岗位操作完成后，系统 SHALL 重新获取最新的活跃人选数据并刷新页面，确保新link和旧link的状态正确显示。

#### Scenario: 默认按岗位分组查看
- **WHEN** HR 进入流程跟进页面
- **THEN** 系统以岗位为分组展示卡片，每张卡片标题为岗位名和人数，内部列出该岗位所有活跃候选人及其当前 stage

#### Scenario: 切换为按阶段分组
- **WHEN** HR 点击"按阶段"切换按钮
- **THEN** 系统以 stage 为分组展示卡片，stage 值来自 CandidateJobLink.stage（后端自动维护）

#### Scenario: 切换回按岗位分组
- **WHEN** HR 点击"按岗位"切换按钮
- **THEN** 系统恢复按岗位分组视图

#### Scenario: 无活跃人选
- **WHEN** 系统中没有任何活跃候选人-岗位关联
- **THEN** 系统显示"暂无进行中的人选"空状态

#### Scenario: 转移岗位后页面刷新
- **WHEN** 用户在展开行中完成转移岗位操作
- **THEN** 系统 SHALL 重新 fetch `/api/pipeline/active` 获取最新数据，替换本地 links 数组，并重新渲染页面内容，确保旧link消失、新link出现在正确的岗位分组中

### Requirement: 搜索跨分组过滤
系统 SHALL 支持跨分组搜索候选人姓名，搜索结果过滤后空分组自动隐藏。

#### Scenario: 搜索过滤候选人
- **WHEN** HR 在搜索框输入关键词
- **THEN** 所有分组中匹配的候选人保留，无匹配候选人的分组卡片隐藏

#### Scenario: 搜索候选人姓名为 null 时不崩溃
- **WHEN** HR 在搜索框输入关键词，且列表中存在 candidate_name 为 null 的记录
- **THEN** 系统跳过该记录继续过滤，不抛出 TypeError

### Requirement: Expanded row shows activity chain timeline
The expanded row in the in-progress page SHALL render the activity chain as a linear timeline. The current (tail) node is the action target; all prior nodes are read-only. The stage dropdown is removed.

#### Scenario: Viewing expanded row with resume_review pending
- **WHEN** user expands a candidate row with only a pending resume_review
- **THEN** the row shows: timeline with one node (简历筛选), action buttons [通过] [淘汰] on that node

#### Scenario: Viewing expanded row with completed history and active tail
- **WHEN** user expands a candidate row with completed resume_review and a scheduled interview
- **THEN** the row shows: completed nodes as read-only, the interview node as the active action target with [填写结果] button

#### Scenario: Viewing expanded row with completed tail awaiting next step
- **WHEN** user expands a candidate row whose tail activity is completed with conclusion=通过
- **THEN** the row shows all history as read-only, plus a "选择下一步" prompt at the end

#### Scenario: Progress dots reflect activity chain
- **WHEN** candidate has resume_review(完成) → phone_screen(完成) → interview(进行中)
- **THEN** progress dots show: ●(简历筛选) → ●(电话初筛) → ○(一面)

### Requirement: 分组内快捷操作
每条候选人记录 SHALL 提供展开行操作（完成当前节点、选择下一步、退出、转岗）。

#### Scenario: 快捷淘汰
- **WHEN** HR 点击"淘汰"按钮
- **THEN** 系统弹出淘汰原因选择弹窗，确认后更新该候选人-岗位关联的 outcome 为 rejected

### Requirement: Withdraw removes candidate from active list
After a candidate withdraws, they SHALL be immediately removed from the in-progress list without requiring a page refresh.

#### Scenario: Withdraw confirmed
- **WHEN** user confirms withdrawal in the withdraw overlay
- **THEN** the candidate's link entry is removed from the local links array and the list re-renders without that candidate

#### Scenario: Hire confirmed
- **WHEN** user confirms hire in the hire overlay
- **THEN** the candidate's link entry is removed from the local links array and the list re-renders without that candidate

## REMOVED Requirements

### Requirement: Stage dropdown has no duplicate 已入职 option
**Reason**: Stage dropdown is removed entirely from the in-progress page. Stage is now derived from the activity chain and displayed as a read-only label.
**Migration**: The 已入职 action is now triggered via the [入职] button shown after an offer activity is completed with conclusion=接受.
