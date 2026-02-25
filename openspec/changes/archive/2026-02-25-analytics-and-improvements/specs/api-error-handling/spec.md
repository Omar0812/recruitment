## ADDED Requirements

### Requirement: API 请求统一错误处理
前端 api helper SHALL 在请求失败（网络错误或 HTTP 4xx/5xx）时显示 toast 错误提示，不静默失败。

#### Scenario: 网络请求失败
- **WHEN** 前端发起 API 请求时网络不可用
- **THEN** 系统显示 toast 提示"网络请求失败，请检查连接"

#### Scenario: 服务端返回 4xx 错误
- **WHEN** 服务端返回 400/404 等错误
- **THEN** 系统显示 toast 提示服务端返回的错误信息

### Requirement: 防重复提交
前端保存按钮 SHALL 在点击后立即进入 disabled 状态，请求完成后恢复，防止重复提交。

#### Scenario: 点击保存后按钮禁用
- **WHEN** HR 点击任意保存/确认按钮
- **THEN** 按钮立即变为 disabled 并显示"保存中..."，直到请求完成

#### Scenario: 请求完成后按钮恢复
- **WHEN** API 请求成功或失败后
- **THEN** 按钮恢复为可点击状态

### Requirement: Toast 提示组件
系统 SHALL 提供轻量 toast 提示函数 `showToast(msg, type)`，在页面右上角显示 2 秒后自动消失。

#### Scenario: 显示成功提示
- **WHEN** 调用 `showToast("保存成功", "success")`
- **THEN** 页面右上角显示绿色提示条，2 秒后自动消失

#### Scenario: 显示错误提示
- **WHEN** 调用 `showToast("操作失败", "error")`
- **THEN** 页面右上角显示红色提示条，2 秒后自动消失
