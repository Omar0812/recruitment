## Why

HR 日常招聘中，面试邀约需要手动在飞书建会议再转发微信，效率低且容易遗漏。候选人简历摘要需要手动整理后分发给用人方。系统已有完整流程数据，但缺少"生成+发送"这最后一公里的能力，导致每次都要切换到其他工具。

## What Changes

- **新增邮件发送能力**：系统支持通过 SMTP 发送面试邀约邮件给候选人
- **新增邮件配置**：设置页新增 SMTP 配置区（host/port/user/password/from_name）
- **新增邮件模板管理**：设置页可编辑面试邀约邮件模板，支持变量替换
- **新增发送入口**：Pipeline 页面面试卡片新增「发送邀约邮件」按钮
- **新增简历摘要复制**：Pipeline 展开区和候选人详情页新增「复制简历摘要」按钮
- **新增拒信文本生成**：淘汰操作后可一键复制拒信文本（基于可编辑模板）

## Capabilities

### New Capabilities

- `email-sending`: SMTP 邮件发送能力，包含配置、模板管理、发送接口
- `resume-summary-copy`: 简历摘要一键生成并复制到剪贴板
- `rejection-text-template`: 拒信文本模板管理与生成复制

### Modified Capabilities

- `vue3-settings-page`: 设置页新增邮件 SMTP 配置区和模板编辑区
- `vue3-pipeline-page`: 面试卡片新增发送邀约邮件入口；淘汰后新增复制拒信入口

## Impact

- **新增后端**：`app/routes/email.py`（发送接口）；`app/routes/settings.py` 扩展（邮件配置读写）
- **配置文件**：`config.json` 新增 `email` 字段（smtp 配置 + 模板文本）
- **前端**：`Settings.vue`、`Pipeline.vue`、`CandidateDetail.vue` 修改
- **依赖**：Python `smtplib`（标准库，无需新增依赖）
