## MODIFIED Requirements

### Requirement: update_activity 同步 payload
`PATCH /api/activities/{id}` SHALL 在更新稀疏列的同时，将被更新的字段同步写入 `payload` JSON 中对应的 key。若 payload 为 null，则不创建新 payload（仅更新稀疏列）。确保 `record_to_dict` 读取时 payload 优先的逻辑与实际数据保持一致。

#### Scenario: 更新面试活动的 conclusion 同步到 payload
- **WHEN** 客户端发送 `PATCH /api/activities/{id}`，body 包含 `{"conclusion": "通过", "score": 4}`，该记录 payload 中有 conclusion/score key
- **THEN** 稀疏列 conclusion/score 更新，payload 中对应 key 也更新为新值

#### Scenario: payload 为 null 时只更新稀疏列
- **WHEN** 客户端发送 `PATCH /api/activities/{id}`，该记录 payload 为 null
- **THEN** 只更新稀疏列，不创建 payload 对象

#### Scenario: 更新 status 为 completed 后读取正确
- **WHEN** 客户端更新面试活动 status='completed'，再次 GET /api/activities?link_id=x
- **THEN** 该记录返回的 status 为 'completed'，不被旧 payload 覆盖

### Requirement: onboard 活动跳过链尾约束
`POST /api/activities` 中，`onboard` 类型 SHALL 跳过链尾约束检查（不要求上一条 chain 活动有 conclusion 或 status=completed）。onboard 是终态操作，可在任意阶段直接触发。

#### Scenario: offer conclusion 为 null 时可创建 onboard
- **WHEN** 当前链尾是 offer 活动，conclusion 为 null（谈判中），客户端发送 `POST /api/activities` type='onboard'
- **THEN** 系统成功创建 onboard 活动，不返回 400

#### Scenario: onboard 创建后自动标记 hired
- **WHEN** onboard 活动创建成功
- **THEN** 对应 CandidateJobLink 的 outcome='hired'，state='HIRED'
