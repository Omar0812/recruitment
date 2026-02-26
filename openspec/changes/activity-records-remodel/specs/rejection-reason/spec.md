## MODIFIED Requirements

### Requirement: Rejection reason options cover three dimensions
When a face evaluation conclusion is "淘汰", the system SHALL present rejection reason options covering capability, willingness, and process dimensions.

#### Scenario: Selecting rejection reason
- **WHEN** user selects "淘汰" as conclusion
- **THEN** rejection reason options shown are:
  能力维度：技术/专业能力不达标、综合素质不匹配、经验年限不足
  意愿维度：薪资期望差距过大、候选人主动放弃、地点/出行不接受
  流程维度：背调未通过、入职前反悔、其他（文本输入）

#### Scenario: Other reason text input
- **WHEN** user selects "其他"
- **THEN** a text input appears for free-form reason entry

### Requirement: Withdrawal reason is required
When a candidate withdraws, the system SHALL require selecting a reason from a predefined list before confirming.

#### Scenario: Confirming withdrawal without reason
- **WHEN** user clicks confirm withdrawal without selecting a reason
- **THEN** an error is shown and withdrawal is not submitted

#### Scenario: Withdrawal reason options
- **WHEN** withdraw overlay is shown
- **THEN** reason options are: 接受了其他Offer、薪资未达预期、岗位职责不符合预期、个人原因（家庭/健康等）、地点/出行问题、其他（文本输入）

#### Scenario: Optional supplementary note
- **WHEN** user selects a withdrawal reason
- **THEN** an optional free-text field is available for additional details
