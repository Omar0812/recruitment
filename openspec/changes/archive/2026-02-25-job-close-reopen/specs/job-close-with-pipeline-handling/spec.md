## ADDED Requirements

### Requirement: 关闭岗位时检查在途候选人
系统 SHALL 在 HR 点击关闭岗位时，检查该岗位是否有 outcome 为 null 的候选人，并根据结果决定后续流程。

#### Scenario: 无在途候选人时直接关闭
- **WHEN** HR 点击关闭按钮，且该岗位 active_count 为 0
- **THEN** 系统直接将岗位 status 改为 closed，显示成功提示

#### Scenario: 有在途候选人时弹窗提示
- **WHEN** HR 点击关闭按钮，且该岗位 active_count > 0
- **THEN** 系统弹窗显示"该岗位还有 N 名候选人在流程中，请选择处理方式"，提供"批量淘汰并关闭"和"仅关闭岗位"两个选项

### Requirement: 批量淘汰并关闭岗位
系统 SHALL 支持在关闭岗位时同时将所有在途候选人标记为已淘汰。

#### Scenario: 批量淘汰并关闭
- **WHEN** HR 在弹窗中选择"批量淘汰并关闭"
- **THEN** 该岗位所有 outcome 为 null 的 links 被设为 rejected，rejection_reason 为"岗位关闭"，岗位 status 改为 closed

#### Scenario: 仅关闭岗位保留流程
- **WHEN** HR 在弹窗中选择"仅关闭岗位"
- **THEN** 岗位 status 改为 closed，候选人 links 的 outcome 保持不变，流程跟进页面仍可见这些候选人
