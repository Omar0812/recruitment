## Why

当前前端是 3750 行单文件 `app.js`，无组件化、无状态管理、全靠全页重载，随着功能增长维护成本急剧上升，且无法支撑未来 Intelligence Layer 所需的复杂交互。现在 API 已趋于稳定（batch-0/1/2 完成），是迁移的最佳时机。

## What Changes

- 新建 `frontend/` 目录，独立 Vite + Vue 3 项目，与 FastAPI 后端彻底分离
- **BREAKING**：静态文件服务从 `static/` 迁移到 Vite 构建产物
- 引入 Vue Router 4 替代当前 hash 路由（`#/today`、`#/pipeline` 等）
- 引入 Pinia 做全局状态管理，消灭全局变量
- 引入 Element Plus 组件库，替换手写的弹窗/表单/表格
- 引入 axios 替代 fetch，统一请求拦截/错误处理
- 逐页迁移（9 个页面），原 `static/app.js` 在迁移完成前保留作为参考
- 开发时：Vite dev server（:5173）代理到 FastAPI（:8000）
- 生产时：`vite build` 输出到 `static/dist/`，FastAPI 服务静态文件

## Capabilities

### New Capabilities
- `vue3-project-setup`: Vite + Vue 3 项目骨架、路由、状态管理、组件库配置
- `vue3-api-layer`: axios 封装、请求拦截、错误处理、类型化 API 模块
- `vue3-today-page`: 今日待办页面 Vue 组件（当前主页，最高优先级）
- `vue3-pipeline-page`: 进行中流程页面 Vue 组件
- `vue3-talent-page`: 人才库页面 Vue 组件
- `vue3-jobs-page`: 岗位管理页面 Vue 组件
- `vue3-candidate-detail`: 候选人详情（弹窗/抽屉）Vue 组件
- `vue3-hired-page`: 已入职页面 Vue 组件
- `vue3-suppliers-page`: 供应商管理页面 Vue 组件
- `vue3-analytics-page`: 数据分析页面 Vue 组件
- `vue3-settings-page`: AI 设置页面 Vue 组件
- `vue3-shared-components`: 通用组件（活动卡片、活动表单、Toast、确认弹窗）

### Modified Capabilities
（所有现有 spec 的需求不变，只是实现层从原生 JS 迁移到 Vue 3）

## Impact

- **新增**：`frontend/` 目录（完整 Vite 项目）
- **新增**：`frontend/package.json`、`vite.config.js`、`frontend/src/`
- **修改**：`app/server.py` — 静态文件服务指向 `static/dist/`（生产）或代理（开发）
- **保留**：`static/app.js`（迁移完成前作为参考，迁移完成后删除）
- **依赖新增**：Node.js（构建时），无运行时新依赖
- **API 不变**：FastAPI 所有路由保持不变，前端只是换了消费方式
