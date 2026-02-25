## MODIFIED Requirements

### Requirement: 候选人支持多条工作经历
候选人档案 SHALL 通过 `work_experience` JSON 数组存储多条工作经历，每条包含 `company`（公司）、`title`（职位）、`period`（时间段，可选）。`years_exp` 字段 SHALL 为 Float 类型，精确到 0.5 年（如 4.5、3.0）。

#### Scenario: 保存多条工作经历
- **WHEN** 候选人有两段工作经历
- **THEN** `work_experience` 存储两条记录，均可完整读取

#### Scenario: 向后兼容旧字段
- **WHEN** 保存含 `work_experience` 的候选人
- **THEN** 系统自动将第一条的 `company` 同步到 `last_company`，`title` 同步到 `last_title` 字段

#### Scenario: 工作年限精度
- **WHEN** AI 解析简历得到 4.5 年工作经验
- **THEN** `years_exp` 存储为 4.5，展示为「4.5年」
