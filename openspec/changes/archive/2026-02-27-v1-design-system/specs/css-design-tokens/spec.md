## ADDED Requirements

### Requirement: CSS语义色变量体系
style.css SHALL 在 `:root` 中定义语义色变量，包括状态色（pass/reject/pending/hired/scheduled/cancelled 各含前景色 `--c-*` 和背景色 `--bg-*`）、品牌色（`--c-primary`、`--c-primary-hover`）、文本色（`--c-text`、`--c-text-secondary`、`--c-text-muted`）、边框色（`--c-border`）、背景色（`--c-bg`、`--c-surface`）。

#### Scenario: 状态色变量可用
- **WHEN** 开发者在CSS中使用 `var(--c-pass)` 和 `var(--bg-pass)`
- **THEN** 渲染出正确的通过状态前景色和背景色

#### Scenario: 品牌色变量可用
- **WHEN** 开发者使用 `var(--c-primary)`
- **THEN** 渲染出项目主色调

### Requirement: CSS间距和圆角变量
style.css SHALL 在 `:root` 中定义间距变量（`--space-xs`、`--space-sm`、`--space-md`、`--space-lg`）和圆角变量（`--radius-sm`、`--radius-md`、`--radius-lg`）。

#### Scenario: 间距变量可用
- **WHEN** 开发者使用 `var(--space-md)`
- **THEN** 渲染出统一的中等间距值

### Requirement: status-badge语义class
style.css SHALL 提供 `.status-badge` 基础class及6个状态修饰class（`.pass`、`.reject`、`.pending`、`.hired`、`.scheduled`、`.cancelled`），每个修饰class使用对应的CSS变量设置前景色和背景色。

#### Scenario: 通过状态badge渲染
- **WHEN** 元素使用 `class="status-badge pass"`
- **THEN** 显示绿色前景+浅绿背景的状态标签

#### Scenario: 淘汰状态badge渲染
- **WHEN** 元素使用 `class="status-badge reject"`
- **THEN** 显示红色前景+浅红背景的状态标签

### Requirement: action-btn-group语义class
style.css SHALL 提供 `.action-btn-group` class，用于操作按钮组的flex横排布局（含gap）。

#### Scenario: 按钮组横排显示
- **WHEN** 容器使用 `class="action-btn-group"`
- **THEN** 子按钮横排排列，间距统一

### Requirement: form-inline语义class
style.css SHALL 提供 `.form-inline` class，用于单行表单布局（flex横排，垂直居中，含gap）。

#### Scenario: 表单元素单行排列
- **WHEN** 表单容器使用 `class="form-inline"`
- **THEN** 内部输入框和按钮在同一行排列

### Requirement: collapsible折叠组件class
style.css SHALL 提供 `.collapsible` 和 `.collapsed` class，`.collapsed` 状态下内容区隐藏。

#### Scenario: 默认折叠
- **WHEN** 元素使用 `class="collapsible collapsed"`
- **THEN** 内容区不可见

#### Scenario: 展开
- **WHEN** 元素移除 `.collapsed` class
- **THEN** 内容区可见

### Requirement: toast样式class
style.css SHALL 提供 `.toast` 基础class及 `.toast-success`、`.toast-error`、`.toast-info` 修饰class，替代app.js中showToast函数的inline style。

#### Scenario: toast使用class渲染
- **WHEN** showToast创建toast元素
- **THEN** 使用 `.toast.toast-success` 等class而非inline cssText
