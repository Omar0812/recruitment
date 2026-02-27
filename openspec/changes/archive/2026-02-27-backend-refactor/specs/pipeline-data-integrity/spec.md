## MODIFIED Requirements

### Requirement: Pipeline business rules enforced via service layer
pipeline 业务规则（黑名单检查、单流程约束、状态机转换）SHALL 在 `app/services/pipeline.py` 中实现，route handler 通过调用 service 函数执行这些规则。业务规则本身不变。

#### Scenario: Blacklist check still enforced
- **WHEN** `POST /api/pipeline/link` 传入黑名单候选人 id
- **THEN** 返回 400 错误，detail 为"候选人已列入黑名单，无法推进流程"

#### Scenario: Single active link constraint still enforced
- **WHEN** `POST /api/pipeline/link` 传入已有活跃流程的候选人 id
- **THEN** 返回 400 错误，detail 包含当前所在岗位名称

#### Scenario: Outcome state machine still correct
- **WHEN** `PATCH /api/pipeline/link/{id}/outcome` 传入 `outcome: "rejected"`
- **THEN** CandidateJobLink.state 变为 `REJECTED`，outcome 变为 `rejected`
