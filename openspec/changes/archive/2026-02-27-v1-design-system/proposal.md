## Why

项目当前无设计系统——CSS中全是硬编码色值，app.js中有40+处inline style，index.html中有7个独立弹窗DOM各自带inline style。视觉不一致、维护成本高、新功能开发时反复造轮子。交互布局上，进行中页展开行信息优先级倒置（历史在上、操作在下），高频操作步骤多。

## What Changes

- 建立CSS变量体系：语义色token（状态色、品牌色、文本色、边框/背景色）+ 间距/圆角token
- 新增语义class：status-badge（6种状态）、action-btn-group、form-inline、timeline-node
- 消灭app.js中所有inline style，替换为CSS class
- 统一7个弹窗为1个通用弹窗容器（JS动态填充内容），删除index.html中6个独立弹窗DOM
- 进行中页展开行重排：操作区在上 → 历史折叠在下
- 简历筛选改为一行表单：`筛选人[___] [✓通过] [✗淘汰]`
- 面试安排：上一步通过后直接展开安排表单
- 淘汰原因弹窗统一：reject-overlay和面试表单内淘汰原因合并为同一套组件

## Capabilities

### New Capabilities
- `css-design-tokens`: CSS变量体系（语义色、间距、圆角）和语义class定义
- `generic-modal`: 通用弹窗容器，替代7个独立弹窗DOM

### Modified Capabilities
- `pipeline-tracking-page`: 展开行布局重排（操作在上、历史折叠在下）、简历筛选改一行表单、面试安排自动展开
- `frontend-ux`: 消灭inline style、淘汰原因组件统一

## Impact

- `static/style.css` — 新增CSS变量 + 语义class，重构现有硬编码色值
- `static/index.html` — 删除6个独立弹窗DOM，保留1个通用容器
- `static/app.js` — 所有inline style替换为class；弹窗逻辑改为动态渲染到通用容器；展开行渲染函数重排；简历筛选/面试安排/淘汰原因组件重写
