## 1. 后端：邮件配置 API

- [x] 1.1 `app/routes/settings.py` 新增 `GET /api/settings/email`，从 config.json 读取 email 配置，password 返回掩码
- [x] 1.2 `app/routes/settings.py` 新增 `PATCH /api/settings/email`，写入 smtp_host/smtp_port/smtp_user/smtp_password/from_name/use_ssl/interview_invite_template/rejection_template 到 config.json
- [x] 1.3 `app/routes/settings.py` 新增 `POST /api/settings/email/verify`，用当前配置尝试 SMTP 登录，返回成功或错误信息
- [x] 1.4 config.json 补充 email 字段示例到 `config.example.json`，缺失 email 字段时后端返回空配置不报错

## 2. 后端：邮件发送 API

- [x] 2.1 新建 `app/routes/email.py`，注册路由到 `main.py`
- [x] 2.2 实现 `POST /api/email/send-interview-invite`，接收 link_id，从数据库读取候选人/岗位/面试信息，用 smtplib 发送邮件
- [x] 2.3 模板变量替换逻辑：`{{candidate_name}}` `{{job_title}}` `{{date}}` `{{time}}` `{{location}}` `{{interviewer}}` `{{company_name}}`
- [x] 2.4 候选人 email 为空时返回 400 错误，SMTP 发送失败时返回 500 并带错误原因

## 3. 前端：邮件配置（Settings.vue）

- [x] 3.1 `frontend/src/api/settings.js` 新增 `getEmailConfig` / `updateEmailConfig` / `verifyEmailConfig` 三个函数
- [x] 3.2 `Settings.vue` 新增邮件配置区：smtp_host/smtp_port/smtp_user/smtp_password/from_name/use_ssl 表单
- [x] 3.3 `Settings.vue` 新增「测试邮件连接」按钮，显示连接结果
- [x] 3.4 `Settings.vue` 新增面试邀约模板编辑区（textarea），显示支持的变量列表
- [x] 3.5 `Settings.vue` 新增拒信模板编辑区（textarea），显示支持的变量列表
- [x] 3.6 邮件配置和模板保存按钮，成功后 ElMessage 提示

## 4. 前端：邮件发送入口（Pipeline.vue）

- [x] 4.1 `frontend/src/api/email.js` 新建，包含 `sendInterviewInvite(linkId)` 函数
- [x] 4.2 Pipeline.vue B 态展开区新增「发送邀约邮件」按钮，候选人无邮箱时禁用并显示 tooltip
- [x] 4.3 点击「发送邀约邮件」弹出 ElDialog 确认弹窗，显示收件人邮箱和邮件内容预览（用当前模板 + 面试数据渲染）
- [x] 4.4 确认后调用发送接口，成功显示 toast"邀约邮件已发送至 xxx"，失败显示错误原因
- [x] 4.5 SMTP 未配置时点击按钮提示"请先在设置页配置邮件发送"

## 5. 前端：简历摘要复制

- [x] 5.1 Pipeline.vue 展开区新增「复制简历摘要」按钮（所有展开态均显示）
- [x] 5.2 实现摘要生成函数：`{姓名} · {现职} @ {公司} · {N}年经验 · {学历} · {技能标签}`，缺失字段跳过
- [x] 5.3 调用 `navigator.clipboard.writeText()` 写入剪贴板，成功后显示"已复制"toast
- [x] 5.4 `CandidateDetail.vue` 同样新增「复制简历摘要」按钮，复用相同生成逻辑

## 6. 前端：拒信文本复制

- [x] 6.1 Pipeline.vue 淘汰操作成功后，展开区显示「复制拒信」按钮
- [x] 6.2 点击后用拒信模板替换 `{{candidate_name}}` `{{job_title}}`，写入剪贴板，显示"已复制"toast
- [x] 6.3 拒信模板未配置时，使用系统内置默认文本（内置一段通用拒信）

