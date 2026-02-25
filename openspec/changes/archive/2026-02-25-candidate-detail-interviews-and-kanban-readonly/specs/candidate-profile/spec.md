## MODIFIED Requirements

### Requirement: 候选人详情展示跟进状态
候选人详情页 SHALL 展示并支持编辑跟进状态。

#### Scenario: 查看跟进状态
- **WHEN** HR 打开候选人详情页
- **THEN** 系统在基本信息区域显示当前跟进状态

#### Scenario: 修改跟进状态
- **WHEN** HR 在候选人详情页修改跟进状态并保存
- **THEN** 系统更新 followup_status 字段并刷新展示

### Requirement: 候选人详情 header 展示当前/最近流程
候选人详情 header SHALL 展示候选人的流程状态：有活跃流程时显示当前岗位和阶段；无活跃流程但有历史投递时，SHALL 显示最近一次投递的岗位名、结果（淘汰/已退出）和淘汰原因（如有），而非"暂无"。

#### Scenario: 有活跃流程
- **WHEN** 候选人有 outcome 为空的投递记录
- **THEN** header 显示"当前流程：[岗位名] → [阶段]"

#### Scenario: 已淘汰候选人展示最近流程
- **WHEN** 候选人所有投递记录均有 outcome（rejected/withdrawn）
- **THEN** header 显示"最近流程：[岗位名] · 淘汰（[淘汰原因]）"或"最近流程：[岗位名] · 已退出"

#### Scenario: 从未投递的候选人
- **WHEN** 候选人无任何投递记录
- **THEN** header 显示"当前流程：暂无"
