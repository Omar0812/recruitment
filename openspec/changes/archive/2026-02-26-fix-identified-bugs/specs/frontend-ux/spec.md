## ADDED Requirements

### Requirement: 简历下载链接正确编码
候选人详情页的"下载简历"链接 SHALL 正确拼接路径，不得使用 `encodeURIComponent` 对整段路径编码（会将 `/` 编码为 `%2F`）。

#### Scenario: 简历下载链接可访问
- **WHEN** 候选人有简历文件，用户点击"下载简历"
- **THEN** 浏览器发起的请求路径格式为 `/resumes/<folder>/<filename>`，服务器返回文件

#### Scenario: 文件名含特殊字符时正确编码
- **WHEN** 简历文件名含空格或中文
- **THEN** 仅文件名部分被编码，路径分隔符 `/` 保持不变

### Requirement: 人才库候选人名 null 安全
人才库表格中候选人姓名列 SHALL 在 `name` 为 null 时 fallback 到 `name_en`，再 fallback 到 `"?"`，不得渲染字符串 "null"。

#### Scenario: 只有英文名的候选人正常显示
- **WHEN** 候选人 `name` 为 null，`name_en` 为 "John"
- **THEN** 表格显示 "John"，不显示 "null"

### Requirement: 删除面试记录使用 api helper
删除面试记录 SHALL 使用统一的 `api` helper（需补充 `api.delete` 方法），失败时自动显示 toast 错误提示。

#### Scenario: 删除成功
- **WHEN** 用户点击删除面试记录
- **THEN** 发送 `DELETE /api/interviews/{id}`，成功后刷新列表

#### Scenario: 删除失败显示 toast
- **WHEN** 删除请求返回非 2xx
- **THEN** 页面显示错误 toast，不静默失败

### Requirement: 面评弹窗每次打开重置视觉状态
`#interview-overlay` 弹窗每次打开时 SHALL 重置星星高亮和结论按钮的 active 状态。

#### Scenario: 第二次打开弹窗状态干净
- **WHEN** 用户第一次填写面评选了 3 星 + "通过"，关闭后再次打开
- **THEN** 星星全部未高亮，结论按钮全部未选中

### Requirement: 备注保存使用 showToast
候选人详情"过往背景" tab 的备注保存 SHALL 使用 `showToast()` 替代 `alert()`。

#### Scenario: 备注保存成功提示
- **WHEN** 用户点击"保存备注"
- **THEN** 页面右上角显示 success toast，不弹出浏览器原生 alert 对话框

### Requirement: 岗位表单保存防重复提交
岗位新建/编辑表单的保存按钮 SHALL 使用 `withLoading` 包裹，保存期间禁用按钮并显示"保存中..."。

#### Scenario: 保存期间按钮禁用
- **WHEN** 用户点击保存，请求尚未返回
- **THEN** 按钮显示"保存中..."且不可再次点击
