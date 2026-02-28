## ADDED Requirements

### Requirement: SMTP 配置管理
系统 SHALL 支持通过设置页配置 SMTP 邮件发送参数，并将配置持久化到 `config.json`。

支持字段：smtp_host、smtp_port、smtp_user、smtp_password、from_name、use_ssl。

#### Scenario: 加载邮件配置
- **WHEN** 用户访问设置页
- **THEN** 调用 `GET /api/settings/email`，展示当前 SMTP 配置（password 显示掩码）

#### Scenario: 保存邮件配置
- **WHEN** 用户填写 SMTP 参数后点击保存
- **THEN** 调用 `PATCH /api/settings/email`，成功后显示保存成功提示

#### Scenario: 测试邮件连接
- **WHEN** 用户点击「测试连接」
- **THEN** 调用 `POST /api/settings/email/verify`，后端尝试 SMTP 登录，返回成功或失败原因

### Requirement: 邮件模板管理
系统 SHALL 支持在设置页编辑面试邀约邮件模板，模板支持变量替换。

支持变量：`{{candidate_name}}` `{{job_title}}` `{{date}}` `{{time}}` `{{location}}` `{{interviewer}}` `{{company_name}}`

#### Scenario: 编辑邀约模板
- **WHEN** 用户在设置页修改邀约邮件模板文本后保存
- **THEN** 模板内容更新至 config.json，下次发送时使用新模板

#### Scenario: 模板变量提示
- **WHEN** 用户在模板编辑区域聚焦
- **THEN** 页面显示支持的变量列表供参考

### Requirement: 面试邀约邮件发送
系统 SHALL 支持从流程看板对已安排面试的候选人一键发送邀约邮件。

#### Scenario: 发送邀约邮件
- **WHEN** 用户在 Pipeline 页面已安排面试的卡片上点击「发送邀约邮件」
- **THEN** 弹出确认弹窗显示收件人邮箱和邮件预览，确认后调用 `POST /api/email/send-interview-invite`

#### Scenario: 候选人无邮箱时禁用
- **WHEN** 候选人的 email 字段为空
- **THEN** 「发送邀约邮件」按钮显示为禁用状态，hover 提示"候选人未填写邮箱"

#### Scenario: 发送成功反馈
- **WHEN** 邮件发送成功
- **THEN** 显示成功 toast 提示"邀约邮件已发送至 xxx@xxx.com"

#### Scenario: 发送失败反馈
- **WHEN** SMTP 发送失败（配置错误/网络问题）
- **THEN** 显示错误提示，包含失败原因，用户可检查设置页配置

#### Scenario: SMTP 未配置时提示
- **WHEN** 用户点击发送但 SMTP 尚未配置
- **THEN** 提示"请先在设置页配置邮件发送"，并提供跳转链接
