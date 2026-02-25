## ADDED Requirements

### Requirement: 查重过滤软删除候选人
查重接口 SHALL 只匹配未被软删除（`deleted_at IS NULL`）的候选人，已合并的副档案不触发重复警告。

#### Scenario: 已合并的副档案不触发重复
- **WHEN** 解析简历得到手机号，且该手机号对应的候选人已被软删除（merged_into 不为 null）
- **THEN** 弹窗不显示重复警告

### Requirement: 合并后刷新人才库列表
系统 SHALL 在候选人合并完成后，若当前页面为人才库页面，自动刷新列表。

#### Scenario: 合并后在人才库页面
- **WHEN** HR 在人才库页面完成候选人合并操作
- **THEN** 人才库列表自动刷新，被合并的副档案不再显示
