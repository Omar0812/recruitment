## ADDED Requirements

### Requirement: Supplier 数据模型
系统 SHALL 提供 Supplier 表，字段包括：id (PK), name (必填), type (猎头/招聘平台/内推/其他), contact_name, phone, email, notes, created_at。

#### Scenario: 创建供应商
- **WHEN** 客户端发送 `POST /api/suppliers` 包含 `{"name": "猎头公司A", "type": "猎头"}`
- **THEN** 系统创建供应商记录并返回完整对象（含 id 和 created_at）

#### Scenario: 创建供应商缺少 name
- **WHEN** 客户端发送 `POST /api/suppliers` 不包含 name 字段
- **THEN** 系统返回 HTTP 422

### Requirement: Supplier CRUD 接口
系统 SHALL 提供 `/api/suppliers` 路由支持完整 CRUD 操作。

#### Scenario: 列出所有供应商
- **WHEN** 客户端发送 `GET /api/suppliers`
- **THEN** 系统返回所有供应商列表，按 name 排序

#### Scenario: 搜索供应商
- **WHEN** 客户端发送 `GET /api/suppliers?q=猎头`
- **THEN** 系统返回 name 包含"猎头"的供应商

#### Scenario: 更新供应商
- **WHEN** 客户端发送 `PATCH /api/suppliers/{id}` 包含 `{"contact_name": "张三"}`
- **THEN** 系统更新该供应商的 contact_name 并返回更新后的对象

#### Scenario: 删除供应商
- **WHEN** 客户端发送 `DELETE /api/suppliers/{id}`
- **THEN** 系统删除该供应商记录，返回 `{"ok": true}`

#### Scenario: 删除已关联候选人的供应商
- **WHEN** 客户端发送 `DELETE /api/suppliers/{id}`，该供应商已被候选人关联
- **THEN** 系统返回 HTTP 400，提示"该供应商已关联候选人，无法删除"

### Requirement: 供应商快捷新增弹窗
前端 SHALL 提供轻量弹窗用于快速新增供应商，弹窗包含 name（必填）和 type（下拉选择）两个字段。

#### Scenario: 快捷新增供应商
- **WHEN** 用户在导入表单或编辑表单点击"新增供应商"按钮
- **THEN** 系统弹出轻量弹窗，包含 name 输入框和 type 下拉选择

#### Scenario: 保存后自动选中
- **WHEN** 用户在快捷弹窗中填写供应商名称并保存
- **THEN** 弹窗关闭，新供应商自动出现在下拉列表中并被选中
