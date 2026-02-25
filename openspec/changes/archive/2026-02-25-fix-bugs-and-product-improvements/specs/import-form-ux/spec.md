## ADDED Requirements

### Requirement: 技能标签输入框
导入弹窗 SHALL 包含 `id="f-tags"` 的技能标签输入框，允许 HR 填写逗号分隔的技能标签，保存时解析为数组存入 `skill_tags`。

#### Scenario: 保存候选人时读取标签
- **WHEN** HR 在标签输入框中填写"Java, Spring, MySQL"并点击保存
- **THEN** 系统将 `["Java", "Spring", "MySQL"]` 作为 `skill_tags` 保存到候选人档案

#### Scenario: 标签输入框为空时
- **WHEN** HR 未填写标签输入框
- **THEN** 系统保存空数组 `[]` 作为 `skill_tags`，不报错
