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

### Requirement: Candidate 关联 supplier_id
Candidate 模型 SHALL 新增 `supplier_id` 外键（nullable），关联 Supplier 表。

#### Scenario: 创建候选人时关联供应商
- **WHEN** 客户端发送 `POST /api/candidates` 包含 `supplier_id: 3`
- **THEN** 系统创建候选人并关联到 id=3 的供应商

#### Scenario: 创建候选人不关联供应商
- **WHEN** 客户端发送 `POST /api/candidates` 不包含 supplier_id
- **THEN** 系统创建候选人，supplier_id 为 null

### Requirement: 候选人 API 返回 supplier_name
`GET /api/candidates/{id}` 和列表接口 SHALL 在返回数据中包含 `supplier_name` 字段（供应商名称，无关联时为 null）。

#### Scenario: 候选人有关联供应商
- **WHEN** 客户端请求候选人详情，该候选人 supplier_id=3，对应供应商名称为"猎头公司A"
- **THEN** 返回数据包含 `"supplier_name": "猎头公司A"`

#### Scenario: 候选人无关联供应商
- **WHEN** 客户端请求候选人详情，该候选人 supplier_id 为 null
- **THEN** 返回数据包含 `"supplier_name": null`

### Requirement: Candidate list API returns complete candidate data
候选人列表 API SHALL 返回每个候选人的完整数据，序列化逻辑 MUST 通过 `CandidateOut` Pydantic schema 实现，不再使用手写 `candidate_to_dict()` 函数。response 字段结构与现有完全一致。

#### Scenario: GET /api/candidates returns valid data
- **WHEN** `GET /api/candidates` 被调用
- **THEN** response 为 candidate 对象数组，每个对象包含 `id`、`display_id`、`display_name`、`name`、`phone`、`email`、`skill_tags`、`supplier_name` 等所有现有字段

#### Scenario: GET /api/candidates/{id} returns single candidate
- **WHEN** `GET /api/candidates/{id}` 被调用且 id 存在
- **THEN** response 为单个 candidate 对象，字段与列表接口一致

#### Scenario: 编辑表单加载供应商
- **WHEN** 用户打开候选人编辑弹窗
- **THEN** "来源渠道"显示为供应商下拉，当前关联的供应商被选中

#### Scenario: 更新供应商关联
- **WHEN** 用户在编辑表单中切换供应商并保存
- **THEN** 系统更新候选人的 supplier_id，source 字段同步更新为新供应商名称

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

### Requirement: 创建候选人 name 字段校验
`POST /api/candidates` SHALL 在入口处校验：若 `name` 和 `name_en` 均为 null 或空字符串，返回 HTTP 400，body 为 `{"detail": "姓名不能为空"}`，不触发数据库层错误。

#### Scenario: name 和 name_en 均为空返回 400
- **WHEN** 客户端发送 `POST /api/candidates`，name 和 name_en 均为 null
- **THEN** 系统返回 HTTP 400，detail 为 "姓名不能为空"

#### Scenario: 只有 name_en 时正常创建
- **WHEN** 客户端发送 `POST /api/candidates`，name 为 null，name_en 为 "John Smith"
- **THEN** 系统以 name_en 填充 name，正常创建候选人
