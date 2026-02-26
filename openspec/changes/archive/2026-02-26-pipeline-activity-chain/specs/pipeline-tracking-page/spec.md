## MODIFIED Requirements

### Requirement: Expanded row shows stage-grouped activity timeline
The expanded row in the in-progress page SHALL render the activity chain as a linear timeline. The current (tail) node is the action target; all prior nodes are read-only. The stage dropdown is removed.

#### Scenario: Viewing expanded row with resume_review pending
- **WHEN** user expands a candidate row with only a pending resume_review
- **THEN** the row shows: timeline with one node (简历筛选), action buttons [通过] [淘汰] on that node

#### Scenario: Viewing expanded row with completed history and active tail
- **WHEN** user expands a candidate row with completed resume_review and a scheduled interview
- **THEN** the row shows: completed nodes as read-only dots, the interview node as the active action target with [填写结果] button

#### Scenario: Viewing expanded row with completed tail awaiting next step
- **WHEN** user expands a candidate row whose tail activity is completed with conclusion=通过
- **THEN** the row shows all history as read-only, plus a "选择下一步" prompt at the end

#### Scenario: Progress dots reflect activity chain
- **WHEN** candidate has resume_review(完成) → phone_screen(完成) → interview(进行中)
- **THEN** progress dots show: ●(简历筛选) → ●(电话初筛) → ○(一面)

## MODIFIED Requirements

### Requirement: 流程跟进页面展示所有活跃人选
系统 SHALL 提供流程跟进页面，以分组卡片形式展示所有当前在招聘流程中（outcome 为 NULL）的候选人。stage 标签从活动链派生显示，不再从 CandidateJobLink.stage 手动维护的值读取（两者值相同，因为后端自动同步）。

#### Scenario: 默认按岗位分组查看
- **WHEN** HR 进入流程跟进页面
- **THEN** 系统以岗位为分组展示卡片，每张卡片标题为岗位名和人数，内部列出该岗位所有活跃候选人及其当前 stage

#### Scenario: 切换为按阶段分组
- **WHEN** HR 点击"按阶段"切换按钮
- **THEN** 系统以 stage 为分组展示卡片，stage 值来自 CandidateJobLink.stage（后端自动维护）

#### Scenario: 无活跃人选
- **WHEN** 系统中没有任何活跃候选人-岗位关联
- **THEN** 系统显示"暂无进行中的人选"空状态

## REMOVED Requirements

### Requirement: Stage dropdown has no duplicate 已入职 option
**Reason**: Stage dropdown is removed entirely from the in-progress page. Stage is now derived from the activity chain and displayed as a read-only label.
**Migration**: The 已入职 action is now triggered via the [入职] button shown after an offer activity is completed with conclusion=接受.
