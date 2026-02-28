## Purpose
定义简历导入弹窗的交互规范，包括教育/工作经历积木式编辑、岗位投递选项格式、AI 解析字段以及技能标签输入。

## Requirements

### Requirement: 导入弹窗积木式教育/工作经历编辑
原简历上传弹窗 SHALL 被 `CreateCandidateDialog.vue` 组件替代。`Talent.vue` 中的「导入简历」按钮及原有 `el-dialog` + `el-upload` 实现 SHALL 移除，改为引用 `CreateCandidateDialog` 组件。积木式教育/工作经历编辑能力在新组件中暂不实现（初版只含基础字段），后续可按需扩展。

#### Scenario: Talent 页点击「新建候选人」
- **WHEN** 用户在 Talent 页点击「新建候选人」按钮
- **THEN** 打开 `CreateCandidateDialog` 弹窗，而非原有的简历上传 dialog

#### Scenario: 候选人创建成功后刷新列表
- **WHEN** `CreateCandidateDialog` emit `created` 事件
- **THEN** Talent 页调用 `fetchCandidates()` 刷新列表

### Requirement: 投递岗位选项显示格式
导入弹窗的岗位选择 SHALL 将「关联岗位」改名为「投递岗位」，选项格式为「岗位名 @编号」（如「前端工程师 @001」）。

#### Scenario: 岗位选项展示
- **WHEN** 弹窗加载岗位列表
- **THEN** 每个选项显示为「{title} @{id三位补零}」格式

### Requirement: AI prompt 提取全量经历
AI 简历解析 SHALL 返回 `education_list` 数组和 `work_experience` 数组，包含简历中所有可识别的经历条目。

#### Scenario: 多段经历提取
- **WHEN** 简历包含本科+硕士教育经历和两段工作经历
- **THEN** AI 返回 `education_list` 含 2 条，`work_experience` 含 2 条

### Requirement: 技能标签输入框
导入弹窗 SHALL 包含 `id="f-tags"` 的技能标签输入框，允许 HR 填写逗号分隔的技能标签，保存时解析为数组存入 `skill_tags`。

#### Scenario: 保存候选人时读取标签
- **WHEN** HR 在标签输入框中填写"Java, Spring, MySQL"并点击保存
- **THEN** 系统将 `["Java", "Spring", "MySQL"]` 作为 `skill_tags` 保存到候选人档案

#### Scenario: 标签输入框为空时
- **WHEN** HR 未填写标签输入框
- **THEN** 系统保存空数组 `[]` 作为 `skill_tags`，不报错

### Requirement: 导入保存后智能跳转
uploadAndConfirm 保存成功后 SHALL 根据是否选择了岗位执行不同跳转。

#### Scenario: 选了岗位后跳转进行中页
- **WHEN** 用户在导入表单中选择了岗位并保存成功
- **THEN** 系统跳转到 `#/pipeline?expand={linkId}`，进行中页自动展开该候选人行

#### Scenario: 没选岗位后跳转人才库
- **WHEN** 用户在导入表单中未选择岗位并保存成功
- **THEN** 系统跳转到 `#/talent`，显示 toast "已入库"

## REMOVED Requirements

### Requirement: 导入表单初始阶段选择器
**Reason**: 流程永远从简历筛选开始，初始阶段选择器（f-stage-block）是多余的。
**Migration**: 删除 index.html 中 f-stage-block 元素和 app.js 中动态加载 stages 的逻辑。候选人入库后自动从 resume_review 开始。

### Requirement: 解析弹窗隐藏多余保存按钮
**Reason**: 原弹窗实现已被 CreateCandidateDialog 组件替代，该 requirement 仅适用于旧版 el-dialog 结构。
**Migration**: CreateCandidateDialog 内部自己管理底部按钮，无需隐藏逻辑。
