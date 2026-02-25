## Why

候选人详情页"查看简历"目前是直接打开/下载文件，无法在页面内预览，查看简历需要切换标签页，体验割裂。

## What Changes

- 候选人详情 tab 新增"简历预览"tab（原"简历背景"改名为"过往背景"）
- 简历预览 tab：PDF 用 iframe 内嵌预览，图片用 img 直接显示，DOCX 后端转 HTML 渲染
- header 的"查看简历"按钮改为"下载简历"，语义更准确
- 后端新增 `/api/candidates/{id}/resume-preview` 接口，返回 DOCX 转换后的 HTML

## Capabilities

### New Capabilities

- `resume-inline-preview`: 候选人详情页内嵌简历预览，支持 PDF / 图片 / DOCX 三种格式

### Modified Capabilities

- 无

## Impact

- `static/app.js`：候选人详情 tab 结构、新增简历预览 tab 渲染逻辑
- `static/index.html`：无需改动（tab 动态渲染）
- `app/routes/candidates.py`：新增 resume-preview 接口，DOCX 转 HTML 用 python-docx
- `requirements.txt`：python-docx 已存在，无需新增依赖
