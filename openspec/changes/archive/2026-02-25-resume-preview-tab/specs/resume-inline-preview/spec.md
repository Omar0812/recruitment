## ADDED Requirements

### Requirement: 候选人详情简历预览 tab
系统 SHALL 在候选人详情页提供"简历预览" tab，支持在页面内直接预览简历文件，无需跳转或下载。

#### Scenario: 有简历时显示简历预览 tab
- **WHEN** 候选人有 resume_path
- **THEN** 详情页显示"简历预览" tab（位于"过往背景"和"投递记录"之间）

#### Scenario: 无简历时隐藏简历预览 tab
- **WHEN** 候选人 resume_path 为空
- **THEN** 详情页不显示"简历预览" tab

#### Scenario: PDF 简历内嵌预览
- **WHEN** 用户点击"简历预览" tab，且简历为 PDF 格式
- **THEN** tab 内用 iframe 内嵌显示 PDF，无需跳转新标签页

#### Scenario: 图片简历直接显示
- **WHEN** 用户点击"简历预览" tab，且简历为 JPG/PNG 格式
- **THEN** tab 内用 img 标签显示图片，宽度自适应容器

#### Scenario: DOCX 简历转 HTML 预览
- **WHEN** 用户点击"简历预览" tab，且简历为 DOCX 格式
- **THEN** 前端调用后端 `/api/candidates/{id}/resume-preview` 接口，将返回的 HTML 渲染在 tab 内，并显示"预览仅供参考，完整格式请下载查看"提示

#### Scenario: 简历预览懒加载
- **WHEN** 用户首次点击"简历预览" tab
- **THEN** 显示加载状态，加载完成后渲染内容；切换到其他 tab 再切回时不重复请求

### Requirement: 简历背景 tab 改名为过往背景
系统 SHALL 将候选人详情页"简历背景" tab 的显示名称改为"过往背景"。

#### Scenario: tab 名称更新
- **WHEN** 用户打开任意候选人详情页
- **THEN** 原"简历背景" tab 显示为"过往背景"

### Requirement: header 下载简历按钮
系统 SHALL 将候选人详情 header 中的"查看简历"按钮文字改为"下载简历"。

#### Scenario: 按钮文字更新
- **WHEN** 候选人有 resume_path，用户查看候选人详情
- **THEN** header 右上角按钮显示"下载简历"，点击行为不变（新标签页打开文件）
