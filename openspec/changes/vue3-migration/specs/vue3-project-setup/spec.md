## ADDED Requirements

### Requirement: Vite + Vue 3 项目骨架
`frontend/` 目录 SHALL 包含完整的 Vite + Vue 3 项目结构，可独立安装依赖并启动开发服务器。

#### Scenario: 开发服务器启动
- **WHEN** 在 `frontend/` 目录执行 `npm run dev`
- **THEN** Vite dev server 在 5173 端口启动，访问 http://localhost:5173 显示应用首页

#### Scenario: 生产构建
- **WHEN** 执行 `npm run build`
- **THEN** 在 `frontend/dist/` 生成静态文件，包含 index.html 和优化后的 JS/CSS

### Requirement: Vite 代理配置
`vite.config.js` SHALL 配置 `/api` 路径代理到 `http://localhost:8000`，开发时无需解决跨域问题。

#### Scenario: API 请求被代理
- **WHEN** 前端在开发环境请求 `/api/jobs`
- **THEN** 请求被 Vite proxy 转发到 `http://localhost:8000/api/jobs`，正常返回数据

### Requirement: Vue Router 4 hash 模式路由
路由 SHALL 使用 hash 模式，保持与现有 `#/today`、`#/pipeline` 等路由路径兼容。

#### Scenario: 路由跳转今日待办
- **WHEN** 用户访问 `/#/today` 或导航到今日待办
- **THEN** 渲染 Today.vue 页面组件

#### Scenario: 路由跳转进行中
- **WHEN** 用户访问 `/#/pipeline`
- **THEN** 渲染 Pipeline.vue 页面组件

### Requirement: Pinia 状态管理
项目 SHALL 使用 Pinia 作为全局状态管理，各页面有独立 store。

#### Scenario: Store 跨组件共享状态
- **WHEN** 多个组件需要访问同一数据（如 jobs 列表）
- **THEN** 从 Pinia store 获取，不通过 props 层层传递

### Requirement: Element Plus 按需引入
项目 SHALL 使用 `unplugin-vue-components` 和 `unplugin-auto-import` 实现 Element Plus 组件和 API 的自动按需引入，无需手动 import。

#### Scenario: 使用 ElButton 无需 import
- **WHEN** 在 .vue 文件中直接使用 `<el-button>`
- **THEN** 构建时自动引入该组件，无 import 语句也不报错

### Requirement: FastAPI 生产静态服务
`app/server.py` SHALL 在生产模式下将根路由和前端路由指向 `frontend/dist/index.html`，API 路由保持不变。

#### Scenario: 生产环境访问根路径
- **WHEN** 用户访问 `http://localhost:8000/`
- **THEN** 返回 `frontend/dist/index.html`

#### Scenario: API 路由不受影响
- **WHEN** 请求 `/api/jobs`
- **THEN** 正常返回 JSON，不被静态文件路由拦截
