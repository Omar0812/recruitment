## ADDED Requirements

### Requirement: 状态下拉与 include_closed 联动
当用户在岗位库状态下拉中选择"已关闭"时，系统 SHALL 自动将 `include_closed` 设为 `true` 发送给后端，无需用户手动勾选"显示已关闭"复选框。

#### Scenario: 下拉选"已关闭"时返回已关闭岗位
- **WHEN** 用户在状态下拉中选择"已关闭"
- **THEN** 请求参数包含 `include_closed=true`，已关闭岗位出现在列表中

#### Scenario: 下拉选其他状态时不强制 include_closed
- **WHEN** 用户在状态下拉中选择"招聘中"或"暂停"
- **THEN** `include_closed` 由复选框状态决定，不强制为 true

#### Scenario: 复选框独立可用
- **WHEN** 用户勾选"显示已关闭"复选框但下拉为"全部状态"
- **THEN** 列表显示所有状态岗位（含已关闭）

### Requirement: 候选人详情英文名去重显示
系统 SHALL 仅在 `name_en` 存在且与 `name` 不同时，在候选人详情 header 中显示英文名。

#### Scenario: 中英文名不同时显示英文名
- **WHEN** 候选人 `name` 为"张三"，`name_en` 为"Zhang San"
- **THEN** header 显示"张三 @C001  Zhang San"

#### Scenario: 中英文名相同时不重复显示
- **WHEN** 候选人 `name` 与 `name_en` 内容相同
- **THEN** header 只显示一次名字，不重复

#### Scenario: 无英文名时正常显示
- **WHEN** 候选人 `name_en` 为空
- **THEN** header 只显示中文名，无额外内容
