## ADDED Requirements

### Requirement: 供应商管理页面 Vue 组件
`frontend/src/pages/Suppliers.vue` SHALL 实现供应商管理页面，对应现有 `#/suppliers` 路由，支持列表、新建、编辑供应商。

#### Scenario: 供应商列表展示
- **WHEN** 用户访问 `/#/suppliers`
- **THEN** 调用 `GET /api/suppliers`，展示供应商列表（含名称、类型、联系人、费率、担保期）

#### Scenario: 新建供应商
- **WHEN** 用户点击「新建供应商」
- **THEN** 弹出表单，填写 name/type/contact_name/phone/email/fee_rate/fee_guarantee_days，提交后调用 `POST /api/suppliers`
