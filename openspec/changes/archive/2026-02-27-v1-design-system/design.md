## Context

当前项目前端为原生JS+CSS单页应用，无构建工具。CSS约720行全部硬编码色值，app.js中40+处inline style控制显隐和布局，index.html中7个独立弹窗DOM各自带样式。视觉不一致，新功能开发时反复手写颜色和间距。

进行中页展开行当前布局：历史活动在上、操作区在下，高频操作需要滚动。简历筛选是多行表单，面试安排需要手动点击展开。

## Goals / Non-Goals

**Goals:**
- 建立CSS变量体系，所有色值、间距、圆角统一管理
- 提供语义class消灭inline style
- 统一弹窗为1个通用容器，减少DOM冗余
- 优化进行中页展开行布局，操作优先

**Non-Goals:**
- 不引入CSS预处理器或构建工具（保持零构建）
- 不做前端模块化拆分（属于第四批）
- 不改变任何业务逻辑或API
- 不做响应式/移动端适配

## Decisions

### D1: CSS变量放在 `:root` 中，分三层

语义色token → 组件class → 使用处。不引入额外的CSS文件，全部写在style.css顶部。

理由：项目只有一个CSS文件，保持简单。`:root`变量浏览器原生支持，零构建。

### D2: 弹窗统一方案——保留1个通用容器，JS动态渲染

保留 `#modal-overlay` 作为通用弹窗容器（已有的导入/编辑弹窗），其他6个弹窗（reject、withdraw、hire、link-job、interview、parse-confirm）改为JS动态渲染到一个新的 `#dialog-overlay` 通用容器中。

理由：`#modal-overlay` 承载导入/编辑表单，DOM结构复杂且有大量绑定逻辑，改动风险高。其他6个弹窗相对简单，适合动态渲染。

### D3: inline style替换策略——逐类归并

按功能分类替换：
1. 显隐控制（`style.display`）→ `.hidden` class（已有）
2. toast样式 → `.toast` + `.toast-success/.toast-error/.toast-info`
3. 状态色（通过/淘汰/待定等）→ `.status-badge.pass/.reject/.pending` 等
4. 布局容器（flex gap等）→ `.action-btn-group`、`.form-inline` 等
5. 折叠/展开 → `.collapsible` + `.collapsed`

### D4: 展开行重排——操作在上，历史折叠在下

当前 `renderExpandInner` 输出顺序：进度条 → 历史活动 → 当前操作 → 辅助操作。
改为：进度条 → 当前操作 → 历史活动（默认折叠）→ 辅助操作。

理由：HR最高频操作是"完成当前节点"，应该第一眼看到。历史记录是参考信息，折叠后按需展开。

### D5: 淘汰原因组件统一

当前有两套淘汰原因UI：reject-overlay弹窗（快捷淘汰）和面试表单内联（面试淘汰）。统一为一个 `renderRejectionReasonForm()` 函数，根据上下文渲染到弹窗或内联位置。

## Risks / Trade-offs

- [大量inline style替换] → 逐个替换并测试，不批量sed。优先替换高频出现的模式。
- [弹窗统一可能影响现有绑定] → 保留modal-overlay不动，只统一其他6个简单弹窗。
- [展开行重排影响用户习惯] → 操作在上是更自然的优先级，历史折叠但一键可展开。
