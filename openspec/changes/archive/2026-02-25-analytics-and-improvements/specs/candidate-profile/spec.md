## ADDED Requirements

### Requirement: 软删除候选人详情页返回 404
`GET /api/candidates/{id}` SHALL 对已软删除（`deleted_at IS NOT NULL`）的候选人返回 404，前端跳转到错误页面。

#### Scenario: 访问已合并删除的候选人
- **WHEN** HR 直接访问已被软删除候选人的详情页 URL
- **THEN** 系统返回 404，前端显示"候选人不存在或已被合并"

### Requirement: 编辑候选人信息写历史记录
`PATCH /api/candidates/{id}` SHALL 在修改候选人基本信息后，写入一条 HistoryEntry 记录变更事件。

#### Scenario: 编辑基本信息后历史记录更新
- **WHEN** HR 修改候选人姓名、手机、邮箱等基本信息并保存
- **THEN** 候选人历史记录 tab 新增一条"信息已更新"记录，包含时间戳
