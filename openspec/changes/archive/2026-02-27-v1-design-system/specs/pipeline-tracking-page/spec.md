## MODIFIED Requirements

### Requirement: Expanded row shows activity chain timeline
The expanded row in the in-progress page SHALL render the activity chain as a linear timeline. Layout order SHALL be: progress dots → current action area (操作区) → activity history (默认折叠) → auxiliary actions (转岗/退出). The current (tail) node is the action target; all prior nodes are read-only. The stage dropdown is removed.

#### Scenario: Viewing expanded row with resume_review pending
- **WHEN** user expands a candidate row with only a pending resume_review
- **THEN** the row shows: progress dots, then action area with actor input and [通过] [淘汰] buttons, then empty history section, then auxiliary actions

#### Scenario: Viewing expanded row with completed history and active tail
- **WHEN** user expands a candidate row with completed resume_review and a scheduled interview
- **THEN** the row shows: progress dots, then interview action area with [填写结果] button, then history section (collapsed, showing "查看历史记录" toggle with count), then auxiliary actions

#### Scenario: Viewing expanded row with completed tail awaiting next step
- **WHEN** user expands a candidate row whose tail activity is completed with conclusion=通过
- **THEN** the row shows: progress dots, then "选择下一步" prompt, then history section (collapsed), then auxiliary actions

#### Scenario: History section toggle
- **WHEN** user clicks "查看历史记录" toggle in the collapsed history section
- **THEN** history section expands showing all completed activity nodes as read-only timeline

#### Scenario: Progress dots reflect activity chain only
- **WHEN** candidate has resume_review(完成) → interview(进行中)
- **THEN** progress dots show: ●(简历筛选) → ○(一面), derived purely from activity chain without job_stages

#### Scenario: Historical phone_screen in progress dots
- **WHEN** candidate has resume_review(完成) → phone_screen(完成) → interview(进行中)
- **THEN** progress dots show: ●(简历筛选) → ●(电话初筛) → ○(一面)

### Requirement: 简历筛选显示筛选人输入框
展开行中 resume_review 节点 SHALL 以单行表单形式渲染：`筛选人[输入框] [✓通过] [✗淘汰]`，使用 `.form-inline` class布局。

#### Scenario: 筛选人输入框展示
- **WHEN** 用户展开一个 resume_review pending 的候选人行
- **THEN** 操作区显示单行表单：筛选人输入框 + 通过按钮 + 淘汰按钮，横排排列

### Requirement: 面试安排自动展开
当上一步活动通过后，Next Step的主操作（安排面试/安排下一轮）SHALL 默认展开表单，无需用户手动点击。

#### Scenario: resume_review通过后自动展开面试安排
- **WHEN** resume_review conclusion=通过，展开行渲染Next Step
- **THEN** 面试安排表单默认展开显示，无需额外点击

#### Scenario: interview通过后自动展开下一轮安排
- **WHEN** interview conclusion=通过，展开行渲染Next Step
- **THEN** 下一轮面试安排表单默认展开显示

## ADDED Requirements

### Requirement: 淘汰原因组件统一
系统 SHALL 提供统一的 `renderRejectionReasonForm()` 函数，用于渲染淘汰原因选择UI（预设6个原因 + 其他 + 补充说明）。该函数可渲染到弹窗（快捷淘汰）或内联位置（面试淘汰），复用同一套DOM结构和交互逻辑。

#### Scenario: 快捷淘汰使用统一组件
- **WHEN** 用户在展开行点击快捷淘汰按钮
- **THEN** 通过openDialog渲染统一淘汰原因表单

#### Scenario: 面试淘汰使用统一组件
- **WHEN** 用户在面试表单中选择结论为淘汰
- **THEN** 内联渲染统一淘汰原因表单（与弹窗版相同的DOM结构）
