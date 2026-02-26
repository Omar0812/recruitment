## 1. CSS变量体系

- [x] 1.1 在style.css `:root`中定义语义色变量（状态色6组前景+背景、品牌色、文本色3级、边框色、背景色2级）
- [x] 1.2 在style.css `:root`中定义间距变量（xs/sm/md/lg）和圆角变量（sm/md/lg）
- [x] 1.3 将style.css中现有硬编码色值替换为CSS变量引用

## 2. 语义class

- [x] 2.1 新增 `.status-badge` 基础class + 6个状态修饰class（pass/reject/pending/hired/scheduled/cancelled）
- [x] 2.2 新增 `.action-btn-group` class（flex横排布局+gap）
- [x] 2.3 新增 `.form-inline` class（单行表单布局）
- [x] 2.4 新增 `.collapsible` + `.collapsed` 折叠组件class
- [x] 2.5 新增 `.toast` + `.toast-success/.toast-error/.toast-info` class

## 3. 通用弹窗容器

- [x] 3.1 在index.html中新增 `#dialog-overlay` 通用弹窗容器DOM（遮罩+标题+内容+底部按钮区）
- [x] 3.2 在app.js中实现 `openDialog(title, contentHTML, options)` 和 `closeDialog()` 函数
- [x] 3.3 将reject-overlay改为通过openDialog动态渲染
- [x] 3.4 将withdraw-overlay改为通过openDialog动态渲染
- [x] 3.5 将hire-overlay改为通过openDialog动态渲染
- [x] 3.6 将link-job-overlay改为通过openDialog动态渲染
- [x] 3.7 将interview-overlay改为通过openDialog动态渲染
- [x] 3.8 将parse-confirm相关逻辑改为通过openDialog动态渲染
- [x] 3.9 从index.html中删除6个独立弹窗DOM

## 4. 消灭inline style

- [x] 4.1 showToast函数：inline cssText替换为 `.toast` class
- [x] 4.2 显隐控制：所有 `style.display` 替换为 `.hidden` class操作
- [x] 4.3 活动卡片渲染：`style.cssText` 替换为CSS class
- [x] 4.4 tab切换：`style.color`/`style.borderBottomColor` 替换为class
- [x] 4.5 其余inline style逐个替换（actionDiv、noteFormDiv、进度箭头等）

## 5. 进行中页展开行重排

- [x] 5.1 renderExpandInner输出顺序改为：进度条 → 操作区 → 历史（折叠）→ 辅助操作
- [x] 5.2 历史活动区域添加折叠/展开toggle（"查看历史记录(N条)"），默认折叠

## 6. 简历筛选改一行表单

- [x] 6.1 resume_review操作区改为form-inline布局：`筛选人[输入框] [✓通过] [✗淘汰]`

## 7. 面试安排自动展开

- [x] 7.1 resume_review/interview通过后，Next Step主操作表单默认展开

## 8. 淘汰原因组件统一

- [x] 8.1 提取统一的 `renderRejectionReasonForm()` 函数
- [x] 8.2 快捷淘汰改为调用openDialog + renderRejectionReasonForm
- [x] 8.3 面试淘汰改为内联调用renderRejectionReasonForm
