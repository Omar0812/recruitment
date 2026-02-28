## ADDED Requirements

### Requirement: 今日待办页 header 新建候选人快捷入口
`Today.vue` 的 week-summary 区域 SHALL 包含「新建候选人」按钮，点击后打开 `CreateCandidateDialog` 弹窗。

#### Scenario: 点击「新建候选人」打开弹窗
- **WHEN** 用户在今日待办页点击「新建候选人」按钮
- **THEN** `CreateCandidateDialog` 弹窗打开

#### Scenario: 候选人创建后不强制刷新待办
- **WHEN** `CreateCandidateDialog` emit `created` 事件
- **THEN** Today 页可选择性刷新（新候选人不一定立刻产生待办项），默认不刷新或仅刷新 weekSummary
