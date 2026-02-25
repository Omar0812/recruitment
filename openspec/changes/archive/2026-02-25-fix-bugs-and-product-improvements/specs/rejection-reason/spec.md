## ADDED Requirements

### Requirement: 淘汰原因后端序列化
后端 `link_to_dict` SHALL 在序列化 CandidateJobLink 时包含 `rejection_reason` 字段，确保前端可正确显示淘汰原因标签。

#### Scenario: link_to_dict 序列化包含 rejection_reason
- **WHEN** 后端序列化 CandidateJobLink 对象
- **THEN** 返回的 JSON 中包含 `rejection_reason` 字段，值为字符串或 null
