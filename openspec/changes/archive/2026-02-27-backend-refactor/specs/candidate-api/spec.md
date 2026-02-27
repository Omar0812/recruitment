## MODIFIED Requirements

### Requirement: Candidate list API returns complete candidate data
候选人列表 API SHALL 返回每个候选人的完整数据，序列化逻辑 MUST 通过 `CandidateOut` Pydantic schema 实现，不再使用手写 `candidate_to_dict()` 函数。response 字段结构与现有完全一致。

#### Scenario: GET /api/candidates returns valid data
- **WHEN** `GET /api/candidates` 被调用
- **THEN** response 为 candidate 对象数组，每个对象包含 `id`、`display_id`、`display_name`、`name`、`phone`、`email`、`skill_tags`、`supplier_name` 等所有现有字段

#### Scenario: GET /api/candidates/{id} returns single candidate
- **WHEN** `GET /api/candidates/{id}` 被调用且 id 存在
- **THEN** response 为单个 candidate 对象，字段与列表接口一致
