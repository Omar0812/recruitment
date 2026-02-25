## MODIFIED Requirements

### Requirement: 候选人详情展示跟进状态
候选人详情页 SHALL 展示并支持编辑跟进状态。

#### Scenario: 查看跟进状态
- **WHEN** HR 打开候选人详情页
- **THEN** 系统在基本信息区域显示当前跟进状态

#### Scenario: 修改跟进状态
- **WHEN** HR 在候选人详情页修改跟进状态并保存
- **THEN** 系统更新 followup_status 字段并刷新展示
