## ADDED Requirements

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

### Requirement: 候选人编辑表单供应商选择
候选人编辑表单的"来源渠道"字段 SHALL 改为供应商下拉选择器，与导入表单一致。

#### Scenario: 编辑表单加载供应商
- **WHEN** 用户打开候选人编辑弹窗
- **THEN** "来源渠道"显示为供应商下拉，当前关联的供应商被选中

#### Scenario: 更新供应商关联
- **WHEN** 用户在编辑表单中切换供应商并保存
- **THEN** 系统更新候选人的 supplier_id，source 字段同步更新为新供应商名称
