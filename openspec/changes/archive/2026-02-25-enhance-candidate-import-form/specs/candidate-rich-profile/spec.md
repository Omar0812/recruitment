## ADDED Requirements

### Requirement: 候选人支持英文名
候选人档案 SHALL 支持 `name_en` 字段存储英文名。`name`（中文名）与 `name_en` 至少一个非空。

#### Scenario: 仅有中文名
- **WHEN** 创建候选人时只填写 `name`，`name_en` 为空
- **THEN** 系统正常保存，`name` 作为显示名

#### Scenario: 仅有英文名
- **WHEN** 创建候选人时只填写 `name_en`，`name` 为空
- **THEN** 系统正常保存，`name_en` 作为显示名

#### Scenario: 两者均为空
- **WHEN** 创建候选人时 `name` 和 `name_en` 均为空
- **THEN** 系统拒绝保存并提示「姓名不能为空」

### Requirement: 候选人支持多条教育经历
候选人档案 SHALL 通过 `education_list` JSON 数组存储多条教育经历，每条包含 `degree`（学历）、`school`（院校）、`major`（专业，可选）、`period`（时间段，可选）。

#### Scenario: 保存多条教育经历
- **WHEN** 候选人有本科和硕士两段教育经历
- **THEN** `education_list` 存储两条记录，均可完整读取

#### Scenario: 向后兼容旧字段
- **WHEN** 保存含 `education_list` 的候选人
- **THEN** 系统自动将第一条的 `degree` 同步到 `education`，`school` 同步到 `school` 字段

### Requirement: 候选人支持多条工作经历
候选人档案 SHALL 通过 `work_experience` JSON 数组存储多条工作经历，每条包含 `company`（公司）、`title`（职位）、`period`（时间段，可选）。

#### Scenario: 保存多条工作经历
- **WHEN** 候选人有两段工作经历
- **THEN** `work_experience` 存储两条记录，均可完整读取

#### Scenario: 向后兼容旧字段
- **WHEN** 保存含 `work_experience` 的候选人
- **THEN** 系统自动将第一条的 `company` 同步到 `last_company`，`title` 同步到 `last_title` 字段
