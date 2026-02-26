## ADDED Requirements

### Requirement: 消灭app.js中所有inline style
app.js中所有通过 `element.style.xxx` 或 `element.style.cssText` 设置的样式 SHALL 替换为CSS class操作（classList.add/remove/toggle）。显隐控制使用 `.hidden` class，布局使用语义class，状态色使用 `.status-badge` 系列class。

#### Scenario: showToast不使用inline style
- **WHEN** showToast函数创建toast元素
- **THEN** 使用 `.toast` + 状态修饰class设置样式，不使用 `style.cssText`

#### Scenario: 显隐控制使用hidden class
- **WHEN** JS需要显示或隐藏元素
- **THEN** 使用 `classList.remove('hidden')` 或 `classList.add('hidden')`，不使用 `style.display`

#### Scenario: 活动卡片不使用inline style
- **WHEN** 渲染活动卡片（renderActivityCard等）
- **THEN** 使用CSS class设置边框、圆角、背景等样式，不使用 `style.cssText`

#### Scenario: tab切换不使用inline style
- **WHEN** 用户切换候选人详情页tab
- **THEN** 使用class控制tab面板显隐和tab按钮高亮，不使用 `style.color` 或 `style.borderBottomColor`

### Requirement: CSS硬编码色值替换为变量
style.css中所有硬编码的颜色值 SHALL 替换为对应的CSS变量引用。

#### Scenario: 按钮使用品牌色变量
- **WHEN** 渲染主操作按钮
- **THEN** 背景色使用 `var(--c-primary)` 而非硬编码色值

#### Scenario: 状态标签使用状态色变量
- **WHEN** 渲染通过/淘汰等状态标签
- **THEN** 颜色使用 `var(--c-pass)` / `var(--c-reject)` 等变量
