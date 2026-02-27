## ADDED Requirements

### Requirement: AI 设置页面 Vue 组件
`frontend/src/pages/Settings.vue` SHALL 实现 AI 设置页面，对应现有 `#/settings` 路由，支持配置 AI provider、base_url、model、api_key。

#### Scenario: 加载当前 AI 配置
- **WHEN** 用户访问 `/#/settings`
- **THEN** 调用 `GET /api/settings/ai`，展示当前配置（api_key 显示掩码）

#### Scenario: 保存 AI 配置
- **WHEN** 用户修改配置后点击保存
- **THEN** 调用 `PATCH /api/settings/ai`，成功后显示 ElMessage 成功提示

#### Scenario: 验证 API 连通性
- **WHEN** 用户点击「测试连接」
- **THEN** 调用 `POST /api/settings/ai/verify`，显示成功或失败的结果
