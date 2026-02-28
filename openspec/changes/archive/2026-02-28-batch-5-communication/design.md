## Context

系统已具备完整的招聘流程管理能力，但在"最后一公里"存在摩擦：发面试邀约需要手动在飞书建会议再转发微信；简历摘要需要手动整理后分发给用人方。系统内已有所有必要数据（候选人信息、岗位、面试时间），缺的是生成+发送能力。

当前技术栈：FastAPI + SQLAlchemy + SQLite，前端 Vue 3 + Element Plus。AI 配置已存于 `config.json`，设置页已有读写 config.json 的模式，本次邮件配置复用相同模式。

## Goals / Non-Goals

**Goals:**
- 系统内一键发送面试邀约邮件给候选人（SMTP）
- 设置页支持配置 SMTP 和编辑邮件模板
- Pipeline 页面面试卡片新增发送入口
- 简历摘要一键生成并复制到剪贴板
- 拒信文本模板管理与生成复制

**Non-Goals:**
- 富文本/HTML 邮件（纯文字足够）
- 邮件发送历史记录
- 邮件发送状态追踪（已读/已送达）
- 多邮件模板管理（每种类型一个模板即可）
- 飞书/微信直接集成

## Decisions

**决策1：邮件配置存在 config.json**

和 AI 配置保持一致，新增 `email` 字段：
```json
{
  "email": {
    "smtp_host": "smtp.feishu.cn",
    "smtp_port": 465,
    "smtp_user": "hr@company.com",
    "smtp_password": "xxx",
    "from_name": "招聘团队",
    "use_ssl": true,
    "interview_invite_template": "尊敬的 {{candidate_name}}，..."
  }
}
```
理由：无需数据库迁移，和现有 settings API 模式一致，读写简单。

**决策2：纯文字邮件，smtplib 标准库**

不引入第三方邮件库（sendgrid/resend），用 Python 标准库 `smtplib` + `email.mime`。
理由：零依赖，飞书企业邮箱支持 SMTP，纯文字邮件无跨客户端渲染问题。

**决策3：模板变量替换，不用模板引擎**

用简单字符串替换 `{{variable}}` 形式，不引入 Jinja2。
支持变量：`{{candidate_name}}` `{{job_title}}` `{{date}}` `{{time}}` `{{location}}` `{{interviewer}}` `{{company_name}}`
理由：变量数量少，简单替换足够，不增加复杂度。

**决策4：简历摘要纯前端生成**

不新增后端接口，前端从现有 candidate 数据组装摘要文本，调用 `navigator.clipboard.writeText()`。
格式：`姓名 · 现职 @ 公司 · N年经验 · 学历 · 技能标签`
理由：数据已在前端，零后端改动。

**决策5：拒信模板存 config.json，生成逻辑在前端**

和邀约模板一致，前端替换变量后复制。
支持变量：`{{candidate_name}}` `{{job_title}}`

## Risks / Trade-offs

- **SMTP 配置错误** → 发送时立即返回错误信息给前端，用户可修正配置；fallback 是手动发
- **候选人邮箱为空** → 发送前校验，邮箱为空时禁用按钮并提示
- **飞书 SMTP 限额** → 面试邀约邮件发送频率低（每天几封），不会触发限额
- **剪贴板 API 兼容性** → 现代浏览器全部支持，本地工具无需考虑兼容性

## Migration Plan

- 无数据库 schema 变更，无 Alembic migration
- config.json 新增 `email` 字段，缺失时后端返回空配置（不报错）
- 部署：重启 `python3 main.py` 即可
