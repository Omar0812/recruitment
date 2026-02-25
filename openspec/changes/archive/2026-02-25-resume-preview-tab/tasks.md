## 1. 后端：DOCX 转 HTML 预览接口

- [x] 1.1 在 `app/routes/candidates.py` 新增 `GET /api/candidates/{id}/resume-preview` 接口
- [x] 1.2 接口读取候选人 `resume_path`，若文件不存在返回 404
- [x] 1.3 若为 DOCX 格式，用 python-docx 提取段落和表格，转成 HTML 字符串返回 `{ html: "..." }`
- [x] 1.4 若为非 DOCX 格式，返回 `{ redirect: "/resumes/..." }` 告知前端直接用静态路径

## 2. 前端：tab 结构调整

- [x] 2.1 将"简历背景" tab 显示名改为"过往背景"（data-tab 值保持不变，只改显示文字）
- [x] 2.2 将 header "查看简历"按钮文字改为"下载简历"
- [x] 2.3 在有 resume_path 时，在"过往背景"和"投递记录"之间插入"简历预览" tab

## 3. 前端：简历预览 tab 渲染

- [x] 3.1 点击"简历预览" tab 时触发懒加载，首次加载前显示 spinner
- [x] 3.2 根据 resume_path 扩展名判断格式：`.pdf` 用 iframe，`.jpg/.jpeg/.png/.gif` 用 img，`.docx` 调后端接口
- [x] 3.3 PDF：渲染 `<iframe src="/resumes/..." style="width:100%;height:700px;border:none">`
- [x] 3.4 图片：渲染 `<img src="/resumes/..." style="max-width:100%">`
- [x] 3.5 DOCX：调 `/api/candidates/{id}/resume-preview`，将返回 HTML 渲染到 div，顶部加"预览仅供参考，完整格式请下载查看"提示
- [x] 3.6 已加载过的内容缓存在变量中，切换 tab 再切回不重复请求
