# candidate-edit-enhancements Specification

## Purpose
TBD - created by archiving change fix-bugs-and-product-improvements. Update Purpose after archive.
## Requirements
### Requirement: 候选人编辑弹窗包含城市字段
候选人编辑弹窗 SHALL 包含城市输入字段，允许 HR 修改候选人所在城市。

#### Scenario: 编辑城市
- **WHEN** HR 打开候选人编辑弹窗
- **THEN** 弹窗中显示城市输入框，预填当前城市值

#### Scenario: 保存城市修改
- **WHEN** HR 修改城市字段并点击保存
- **THEN** 系统将新城市值 PATCH 到候选人档案，详情页刷新后显示新城市

### Requirement: years_exp 使用 parseFloat
导入弹窗保存候选人时 SHALL 使用 `parseFloat` 解析工作年限，保留小数部分。

#### Scenario: 工作年限含小数
- **WHEN** HR 在工作年限输入框填写"3.5"
- **THEN** 系统保存 `years_exp = 3.5`，不丢失小数

### Requirement: display_name null 安全
后端 `candidate_to_dict` SHALL 在 name 和 name_en 均为 null 时，`display_name` 不输出字符串 "None"，而是使用空字符串或 display_id。

#### Scenario: name 和 name_en 均为 null
- **WHEN** 候选人 name 和 name_en 均为 null
- **THEN** `display_name` 返回 `@C001` 格式，不包含字符串 "None"

