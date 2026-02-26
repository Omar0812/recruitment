## MODIFIED Requirements

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

### Requirement: Expanded row shows activity chain timeline
The expanded row in the in-progress page SHALL render the activity chain as a linear timeline. The current (tail) node is the action target; all prior nodes are read-only. The stage dropdown is removed.

#### Scenario: Viewing expanded row with resume_review pending
- **WHEN** user expands a candidate row with only a pending resume_review
- **THEN** the row shows: timeline with one node (简历筛选), actor input field, action buttons [通过] [淘汰] on that node

#### Scenario: Viewing expanded row with completed history and active tail
- **WHEN** user expands a candidate row with completed resume_review and a scheduled interview
- **THEN** the row shows: completed nodes as read-only, the interview node as the active action target with [填写结果] button

#### Scenario: Viewing expanded row with completed tail awaiting next step
- **WHEN** user expands a candidate row whose tail activity is completed with conclusion=通过
- **THEN** the row shows all history as read-only, plus a "选择下一步" prompt at the end

#### Scenario: Progress dots reflect activity chain only
- **WHEN** candidate has resume_review(完成) → interview(进行中)
- **THEN** progress dots show: ●(简历筛选) → ○(一面), derived purely from activity chain without job_stages

#### Scenario: Historical phone_screen in progress dots
- **WHEN** candidate has resume_review(完成) → phone_screen(完成) → interview(进行中)
- **THEN** progress dots show: ●(简历筛选) → ●(电话初筛) → ○(一面)

## ADDED Requirements

### Requirement: 导入后自动展开对应行
进行中页 SHALL 支持 URL 参数 `expand={linkId}`，页面加载时自动展开对应候选人行。

#### Scenario: 从导入跳转到进行中页
- **WHEN** URL 为 `#/pipeline?expand=42`
- **THEN** 页面加载后自动找到 linkId=42 的行并展开，滚动到可见位置

#### Scenario: expand 参数无匹配
- **WHEN** URL 包含 expand 参数但对应 linkId 不在当前列表中
- **THEN** 页面正常渲染，不展开任何行，不报错

### Requirement: Next Step 简化为最多两个选项
renderNextStep SHALL 在每个节点最多显示2个选项：主操作默认展开表单，备选操作显示为文字链。

#### Scenario: resume_review 通过后的 Next Step
- **WHEN** resume_review conclusion=通过
- **THEN** 显示主操作"安排面试"（默认展开面试安排表单）和备选文字链"直接发Offer"

#### Scenario: interview 通过后的 Next Step
- **WHEN** interview conclusion=通过
- **THEN** 显示主操作"安排下一轮面试"（默认展开面试安排表单）和备选文字链"发Offer"

#### Scenario: offer 接受后的 Next Step
- **WHEN** offer conclusion=接受 且 outcome 仍为 null
- **THEN** 显示唯一操作"确认入职"按钮

#### Scenario: 点击备选文字链切换表单
- **WHEN** 用户点击备选文字链（如"直接发Offer"）
- **THEN** 当前展开的表单切换为 Offer 表单

### Requirement: 简历筛选显示筛选人输入框
展开行中 resume_review 节点 SHALL 在通过/淘汰按钮上方显示"筛选人"文本输入框。

#### Scenario: 筛选人输入框展示
- **WHEN** 用户展开一个 resume_review pending 的候选人行
- **THEN** 在通过/淘汰按钮上方显示"筛选人"输入框

## REMOVED Requirements

### Requirement: Progress dots reflect phone_screen as separate step
**Reason**: phone_screen is retired as a creatable type. Progress dots no longer show phone_screen as a standard step. Historical phone_screen records are still rendered if present in the chain.
**Migration**: Progress dots are now derived purely from the activity chain. No predefined stage list is used.
