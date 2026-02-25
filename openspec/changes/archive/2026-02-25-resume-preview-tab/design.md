## Context

候选人详情页目前有三个 tab：简历背景、投递记录、历史记录。"查看简历"是 header 里的一个链接，点击后在新标签页打开或下载文件。简历文件存储在本地 `data/resumes/` 目录，通过 `/resumes/` 静态路由提供访问。

支持的文件格式：PDF、DOCX/DOC、JPG/PNG（图片简历）。

## Goals / Non-Goals

**Goals:**
- 新增"简历预览" tab，支持在页面内直接预览简历
- PDF 用 iframe 内嵌，图片用 img 显示，DOCX 后端转 HTML 渲染
- "简历背景" tab 改名为"过往背景"
- header "查看简历"按钮改为"下载简历"

**Non-Goals:**
- 不支持 DOC（旧版 Word）格式预览
- 不引入新的 npm 包或前端库
- 不改变文件存储结构

## Decisions

**PDF 预览**：直接用 `<iframe src="/resumes/...">` 内嵌，浏览器原生支持，无需后端处理。

**DOCX 预览**：后端新增 `GET /api/candidates/{id}/resume-preview` 接口，用 python-docx 提取段落和表格，转成简单 HTML 字符串返回。前端用 `<div>` 渲染 innerHTML。格式会有损失但文字内容完整，满足快速查看需求。python-docx 已在依赖中，无需新增。

**图片预览**：`<img src="/resumes/...">` 直接显示，加 `max-width:100%` 适配容器。

**格式判断**：根据 `resume_path` 文件扩展名（`.pdf`/`.docx`/`.jpg`/`.png` 等）决定渲染方式，前端判断即可，无需后端额外接口（DOCX 除外）。

**tab 切换时懒加载**：点击"简历预览" tab 时才发起预览请求，避免每次打开候选人详情都触发转换。

## Risks / Trade-offs

- [DOCX 转 HTML 格式损失] → 明确告知用户"预览仅供参考，完整格式请下载查看"
- [大文件 iframe 加载慢] → 加 loading 状态提示
- [无简历时 tab 显示] → 无 resume_path 时隐藏"简历预览" tab
