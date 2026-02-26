## ADDED Requirements

### Requirement: PATCH 接口过滤软删除候选人
`PATCH /api/candidates/{id}` 在查询候选人时 SHALL 过滤 `deleted_at IS NULL`，已合并/软删除的候选人不可被更新，返回 404。

#### Scenario: 更新已软删除候选人返回 404
- **WHEN** 客户端发送 `PATCH /api/candidates/{id}`，该候选人 `deleted_at` 不为 NULL
- **THEN** 系统返回 HTTP 404，body 为 `{"detail": "候选人不存在"}`

#### Scenario: 更新正常候选人成功
- **WHEN** 客户端发送 `PATCH /api/candidates/{id}`，该候选人 `deleted_at` 为 NULL
- **THEN** 系统正常更新并返回 200

### Requirement: 候选人搜索支持英文名
`GET /api/candidates?q=` 的全文搜索 SHALL 同时匹配 `name_en` 字段。

#### Scenario: 按英文名搜索
- **WHEN** 客户端发送 `GET /api/candidates?q=John`，存在 `name_en = "John Smith"` 的候选人
- **THEN** 该候选人出现在返回列表中

#### Scenario: 按中文名搜索不受影响
- **WHEN** 客户端发送 `GET /api/candidates?q=张三`
- **THEN** 仅返回 `name` 包含"张三"的候选人

### Requirement: 删除 check_duplicate 死代码
`POST /api/candidates/check-duplicate` 函数体中 `return {"matches": matches}` 之后的两行代码 SHALL 被删除。

#### Scenario: check_duplicate 正常返回
- **WHEN** 客户端发送 `POST /api/candidates/check-duplicate`
- **THEN** 系统返回 `{"matches": [...]}` 且无运行时错误
