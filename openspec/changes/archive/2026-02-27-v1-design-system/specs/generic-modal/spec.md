## ADDED Requirements

### Requirement: 通用弹窗容器
index.html SHALL 包含一个 `#dialog-overlay` 通用弹窗容器，用于动态渲染各类业务弹窗（淘汰原因、退出确认、入职确认、关联岗位、面试面评、解析确认）。容器包含遮罩层、标题区、内容区、底部按钮区。

#### Scenario: 弹窗容器存在
- **WHEN** 页面加载完成
- **THEN** DOM中存在 `#dialog-overlay` 元素，默认隐藏

#### Scenario: 动态渲染弹窗内容
- **WHEN** JS调用通用弹窗打开函数并传入标题和内容HTML
- **THEN** `#dialog-overlay` 显示，标题区和内容区填充传入内容

#### Scenario: 关闭弹窗
- **WHEN** 用户点击关闭按钮或遮罩层
- **THEN** `#dialog-overlay` 隐藏，内容区清空

### Requirement: 删除独立弹窗DOM
index.html SHALL 删除以下独立弹窗DOM：`#reject-overlay`、`#withdraw-overlay`、`#hire-overlay`、`#link-job-overlay`、`#interview-overlay`、`#parse-confirm-overlay`。这些弹窗的内容改为通过JS动态渲染到 `#dialog-overlay`。

#### Scenario: 独立弹窗DOM不存在
- **WHEN** 页面加载完成
- **THEN** DOM中不存在 `#reject-overlay`、`#withdraw-overlay`、`#hire-overlay`、`#link-job-overlay`、`#interview-overlay`、`#parse-confirm-overlay`

### Requirement: openDialog/closeDialog API
app.js SHALL 提供 `openDialog(title, contentHTML, options)` 和 `closeDialog()` 函数。openDialog接受标题、内容HTML和可选配置（onConfirm回调、confirmText、cancelText）。closeDialog清空内容并隐藏容器。

#### Scenario: 打开淘汰原因弹窗
- **WHEN** 用户触发淘汰操作
- **THEN** 调用openDialog渲染淘汰原因表单到 `#dialog-overlay`

#### Scenario: 打开退出确认弹窗
- **WHEN** 用户触发退出操作
- **THEN** 调用openDialog渲染退出原因表单到 `#dialog-overlay`

#### Scenario: 打开入职确认弹窗
- **WHEN** 用户触发入职确认
- **THEN** 调用openDialog渲染入职确认内容到 `#dialog-overlay`
