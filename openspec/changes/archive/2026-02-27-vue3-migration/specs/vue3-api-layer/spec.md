## ADDED Requirements

### Requirement: axios 封装与请求拦截
`frontend/src/api/` 目录 SHALL 包含 axios 实例封装，统一处理请求头、错误 toast、loading 状态。

#### Scenario: 请求失败自动 toast
- **WHEN** API 请求返回非 2xx 状态码
- **THEN** 自动弹出 Element Plus ElMessage 错误提示，显示后端 detail 字段或默认错误文案

#### Scenario: DELETE 请求支持 body
- **WHEN** 调用封装的 `api.delete(url, data)` 并传入 data
- **THEN** 请求携带 JSON body，Content-Type 为 application/json

### Requirement: 按资源分模块的 API 文件
`frontend/src/api/` 下 SHALL 按资源分文件（candidates.js、jobs.js、pipeline.js、activities.js、insights.js、suppliers.js、settings.js），每个文件导出该资源的所有 API 函数。

#### Scenario: 调用候选人列表 API
- **WHEN** 组件调用 `candidatesApi.list({ q: '张三' })`
- **THEN** 发出 GET /api/candidates?q=张三 请求并返回数据

### Requirement: withLoading 工具函数
`frontend/src/api/utils.js` SHALL 提供 `withLoading(ref, asyncFn)` 函数，在异步操作期间将 ref 设为 true，完成后设为 false。

#### Scenario: 加载状态自动管理
- **WHEN** 调用 `withLoading(loading, fetchData)`
- **THEN** fetchData 执行期间 loading.value 为 true，完成后为 false（无论成功或失败）
