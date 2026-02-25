## ADDED Requirements

### Requirement: 流程跟进搜索 null 安全
流程跟进页面搜索候选人时 SHALL 安全处理 `candidate_name` 为 null 的情况，不抛出 JS 错误。

#### Scenario: 搜索候选人姓名为 null 时不崩溃
- **WHEN** HR 在搜索框输入关键词，且列表中存在 candidate_name 为 null 的记录
- **THEN** 系统跳过该记录继续过滤，不抛出 TypeError
