## ADDED Requirements

### Requirement: 候选人详情组件
`frontend/src/components/CandidateDetail.vue` SHALL 实现候选人详情抽屉/弹窗，展示基本信息、简历预览、流程历史、活动时间线。

#### Scenario: 打开候选人详情
- **WHEN** 用户点击任意列表中的候选人名字
- **THEN** 从右侧滑出 ElDrawer，展示候选人完整信息

#### Scenario: 活动时间线展示
- **WHEN** 候选人详情打开，且候选人有历史流程
- **THEN** 展示该 link 下的活动时间线（resume_review → interview → offer → onboard），每条显示类型、阶段、时间、结论

#### Scenario: 简历预览
- **WHEN** 候选人有 resume_path，用户点击「查看简历」
- **THEN** 在详情内嵌区域展示简历内容（PDF iframe 或 DOCX 转 HTML）

#### Scenario: 编辑候选人信息
- **WHEN** 用户点击「编辑」
- **THEN** 基本信息字段变为可编辑状态，保存后调用 `PATCH /api/candidates/{id}`
