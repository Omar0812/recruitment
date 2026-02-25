## ADDED Requirements

### Requirement: 已关闭岗位支持重新打开
系统 SHALL 在已关闭岗位的操作列显示"重新打开"按钮，点击后将岗位状态恢复为 open。

#### Scenario: 重新打开已关闭岗位
- **WHEN** HR 在岗位列表中点击已关闭岗位的"重新打开"按钮
- **THEN** 岗位 status 改为 open，列表刷新，该岗位显示在招聘中列表中

#### Scenario: 招聘中岗位不显示重新打开按钮
- **WHEN** 岗位 status 为 open 或 paused
- **THEN** 操作列不显示"重新打开"按钮，只显示"编辑"和"关闭"
