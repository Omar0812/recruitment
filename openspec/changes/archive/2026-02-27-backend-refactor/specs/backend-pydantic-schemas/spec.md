## ADDED Requirements

### Requirement: Unified Pydantic response schemas replace hand-written to_dict
`app/schemas.py` SHALL 定义 `CandidateOut`、`LinkOut`、`ActivityOut` 三个 Pydantic response model，替代 `candidate_to_dict()`、`link_to_dict()`、`record_to_dict()`。所有 model 使用 `model_config = ConfigDict(from_attributes=True)` 支持从 ORM 对象直接构建。

#### Scenario: Schema replaces to_dict in route
- **WHEN** route handler 返回候选人数据
- **THEN** 调用 `CandidateOut.model_validate(candidate_obj)` 而非 `candidate_to_dict(candidate_obj)`

#### Scenario: Adding a new field
- **WHEN** 需要在候选人 response 中增加新字段
- **THEN** 只需修改 `app/schemas.py` 中 `CandidateOut` 的定义，route handler 和 to_dict 无需改动

### Requirement: Response field parity with current to_dict output
`CandidateOut` SHALL 包含现有 `candidate_to_dict()` 返回的所有字段：`id`、`display_id`、`display_name`、`name`、`name_en`、`phone`、`email`、`age`、`education`、`school`、`city`、`last_company`、`last_title`、`years_exp`、`skill_tags`、`source`、`referred_by`、`supplier_id`、`supplier_name`、`supplier_fee_rate`、`supplier_fee_guarantee_days`、`supplier_payment_notes`、`notes`、`resume_path`、`followup_status`、`starred`、`blacklisted`、`blacklist_reason`、`blacklist_note`、`education_list`、`work_experience`、`created_at`、`updated_at`。

#### Scenario: Field completeness check
- **WHEN** API 返回候选人数据
- **THEN** response JSON 的所有 key 与现有 `candidate_to_dict` 输出完全一致，不多不少

### Requirement: ActivityOut preserves payload-first read logic
`ActivityOut` SHALL 在序列化时优先从 `payload JSON` 读取字段值，当 payload 中无对应 key 时 fallback 到稀疏列，与现有 `record_to_dict()` 行为完全一致。

#### Scenario: Interview activity with payload
- **WHEN** ActivityRecord 的 `payload` 包含 `{"round": "终面", "score": 4}`
- **THEN** `ActivityOut.round == "终面"`、`ActivityOut.score == 4`，即使稀疏列 `r.round` 为 None

#### Scenario: Legacy activity without payload
- **WHEN** ActivityRecord 的 `payload` 为 None（历史数据）
- **THEN** `ActivityOut` fallback 读取稀疏列，不报错

### Requirement: Computed fields in CandidateOut
`CandidateOut` SHALL 包含计算字段 `display_id`（`f"C{id:03d}"`）和 `display_name`（组合 name/name_en + display_id），以及来自关联 Supplier 的 `supplier_name`、`supplier_fee_rate`、`supplier_fee_guarantee_days`、`supplier_payment_notes`。

#### Scenario: Computed display_id
- **WHEN** candidate id 为 5
- **THEN** `display_id == "C005"`

#### Scenario: Supplier fields from relationship
- **WHEN** candidate 关联了 supplier
- **THEN** `supplier_name`、`supplier_fee_rate` 等字段正确填充 supplier 数据
