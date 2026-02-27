## MODIFIED Requirements

### Requirement: Activity serialization via Pydantic schema
activity records 序列化 SHALL 通过 `ActivityOut` Pydantic schema 实现，不再使用手写 `record_to_dict()` 函数。payload 优先读逻辑 MUST 保留，行为与现有完全一致。

#### Scenario: GET /api/activities returns serialized records
- **WHEN** `GET /api/activities?link_id={id}` 被调用
- **THEN** response 为 activity 对象数组，每个对象包含 `id`、`type`、`stage`、`payload`、`conclusion`、`round`、`score` 等现有所有字段

#### Scenario: Payload-first read preserved
- **WHEN** ActivityRecord 的 payload 包含 `conclusion` 字段
- **THEN** `ActivityOut.conclusion` 读取 payload 中的值，忽略稀疏列 `r.conclusion`
