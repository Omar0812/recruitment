## MODIFIED Requirements

### Requirement: 导入弹窗积木式教育/工作经历编辑
原 import-form-ux 规范中的简历上传弹窗 SHALL 被 `CreateCandidateDialog.vue` 组件替代。`Talent.vue` 中的「导入简历」按钮及原有 `el-dialog` + `el-upload` 实现 SHALL 移除，改为引用 `CreateCandidateDialog` 组件。积木式教育/工作经历编辑能力在新组件中暂不实现（初版只含基础字段），后续可按需扩展。

#### Scenario: Talent 页点击「新建候选人」
- **WHEN** 用户在 Talent 页点击「新建候选人」按钮
- **THEN** 打开 `CreateCandidateDialog` 弹窗，而非原有的简历上传 dialog

#### Scenario: 候选人创建成功后刷新列表
- **WHEN** `CreateCandidateDialog` emit `created` 事件
- **THEN** Talent 页调用 `fetchCandidates()` 刷新列表

## REMOVED Requirements

### Requirement: 解析弹窗隐藏多余保存按钮
**Reason**: 原弹窗实现已被 CreateCandidateDialog 组件替代，该 requirement 仅适用于旧版 el-dialog 结构。
**Migration**: CreateCandidateDialog 内部自己管理底部按钮，无需隐藏逻辑。
