## MODIFIED Requirements

### Requirement: 解除黑名单 API 支持 request body
`DELETE /api/candidates/{id}/blacklist` 接口 SHALL 接受 JSON body `{"reason": string}`，reason 字段为必填。前端调用 `api.delete()` 时 SHALL 传入 body 参数，后端收到 reason 并记录到 HistoryEntry。

#### Scenario: 解除黑名单携带原因
- **WHEN** 客户端发送 `DELETE /api/candidates/{id}/blacklist`，body 为 `{"reason": "重新评估，决定启用"}`
- **THEN** 系统清除候选人的 blacklisted/blacklist_reason/blacklist_note 字段，返回 200，HistoryEntry 记录解除原因

#### Scenario: 前端 api.delete 支持 body
- **WHEN** 前端调用 `api.delete(url, {reason: "..."})`
- **THEN** 请求携带 `Content-Type: application/json` header 和 JSON body，不丢弃 body 参数

#### Scenario: 解除黑名单不传 reason 时 400
- **WHEN** 客户端发送 `DELETE /api/candidates/{id}/blacklist`，body 为空
- **THEN** 系统返回 HTTP 422（Pydantic 校验失败）

## ADDED Requirements

### Requirement: 创建候选人 name 字段校验
`POST /api/candidates` SHALL 在入口处校验：若 `name` 和 `name_en` 均为 null 或空字符串，返回 HTTP 400，body 为 `{"detail": "姓名不能为空"}`，不触发数据库层错误。

#### Scenario: name 和 name_en 均为空返回 400
- **WHEN** 客户端发送 `POST /api/candidates`，name 和 name_en 均为 null
- **THEN** 系统返回 HTTP 400，detail 为 "姓名不能为空"

#### Scenario: 只有 name_en 时正常创建
- **WHEN** 客户端发送 `POST /api/candidates`，name 为 null，name_en 为 "John Smith"
- **THEN** 系统以 name_en 填充 name，正常创建候选人
