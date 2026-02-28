## MODIFIED Requirements

### Requirement: AI 设置页面 Vue 组件
`frontend/src/pages/Settings.vue` SHALL 实现 AI 设置页面，对应现有 `#/settings` 路由，支持配置 AI provider、base_url、model、api_key。页面 SHALL 同时包含邮件 SMTP 配置区和邮件模板编辑区（面试邀约模板、拒信模板）。

#### Scenario: 加载当前 AI 配置
- **WHEN** 用户访问 `/#/settings`
- **THEN** 调用 `GET /api/settings/ai`，展示当前配置（api_key 显示掩码）

#### Scenario: 保存 AI 配置
- **WHEN** 用户修改配置后点击保存
- **THEN** 调用 `PATCH /api/settings/ai`，成功后显示 ElMessage 成功提示

#### Scenario: 验证 API 连通性
- **WHEN** 用户点击「测试连接」
- **THEN** 调用 `POST /api/settings/ai/verify`，显示成功或失败的结果

#### Scenario: 加载邮件配置
- **WHEN** 用户访问 `/#/settings`
- **THEN** 调用 `GET /api/settings/email`，在邮件配置区展示 SMTP 参数（password 掩码）

#### Scenario: 保存邮件配置
- **WHEN** 用户填写 SMTP 参数后点击保存
- **THEN** 调用 `PATCH /api/settings/email`，成功后显示保存成功提示

#### Scenario: 测试邮件连接
- **WHEN** 用户点击「测试邮件连接」
- **THEN** 调用 `POST /api/settings/email/verify`，显示连接成功或失败原因

#### Scenario: 编辑邮件模板
- **WHEN** 用户在模板编辑区修改面试邀约模板或拒信模板后保存
- **THEN** 调用 `PATCH /api/settings/email`，更新模板内容
