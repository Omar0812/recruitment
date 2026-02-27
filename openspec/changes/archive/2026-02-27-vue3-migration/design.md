## Context

项目当前前端是 `static/app.js`（3750行单文件）+ 原生 HTML/CSS，所有页面逻辑、状态管理、事件绑定都在同一文件中。后端 FastAPI API 已经成熟稳定（batch-0/1/2 完成），API 契约清晰。这是一次纯前端架构替换，不改变任何后端逻辑。

## Goals / Non-Goals

**Goals:**
- 建立 Vue 3 + Vite 独立前端项目结构
- 逐页迁移9个页面，每页可独立交付
- 开发体验：HMR、组件化、TypeScript（可选）、Pinia 状态管理
- 生产构建：`vite build` → `static/dist/`，FastAPI 静态服务

**Non-Goals:**
- 不修改任何 FastAPI 后端逻辑和 API 接口
- 不引入 SSR（服务端渲染）
- 不做 TypeScript 强类型（可选加，不强制）
- 不在本 change 内完成所有页面迁移（只完成骨架 + 今日待办页）

## Decisions

**D1：框架选 Vue 3（Composition API）**
- 对比：React 生态更大但学习曲线高；Alpine.js 太轻无法支撑复杂状态；Svelte 社区较小
- Vue 3 Composition API 最接近当前原生 JS 的写法，迁移阻力最小
- Element Plus 中文文档完善，表单/表格/弹窗组件直接覆盖招聘工具核心 UI

**D2：构建工具选 Vite**
- Create-vue 官方脚手架，零配置开箱即用
- 开发时 HMR 毫秒级热更新，生产构建基于 Rollup 产物体积小
- 代理配置一行解决跨域（`vite.config.js` 中 proxy /api → http://localhost:8000）

**D3：状态管理选 Pinia**
- Vue 3 官方推荐，比 Vuex 4 更简洁
- 各页面用独立 store（todayStore、pipelineStore 等），不做全局单一 store
- 共享状态（jobs 列表、suppliers 列表）放在 shared store

**D4：目录结构**
```
frontend/
  src/
    api/          # axios 封装，每个资源一个文件
    stores/       # Pinia stores
    components/   # 共享组件（ActivityCard、ActivityForm 等）
    pages/        # 页面组件（Today.vue、Pipeline.vue 等）
    router/       # Vue Router 配置
    main.js       # 入口
  index.html
  vite.config.js
  package.json
```

**D5：生产部署方式**
- `vite build` 输出到 `frontend/dist/`
- FastAPI `server.py` 将 `/` 和 `/*` 路由指向 `frontend/dist/index.html`
- API 请求 `/api/*` 保持原样
- 开发时：`vite dev`（port 5173）+ FastAPI（port 8000），vite proxy 转发 /api

**D6：迁移顺序**
优先今日待办页（最重要），然后进行中流程页，依次迁移。原 `app.js` 在全部页面迁移完成前保留，最后统一删除。

**D7：Element Plus 按需引入**
使用 `unplugin-vue-components` + `unplugin-auto-import` 实现自动按需引入，不手动 import 每个组件。

## Risks / Trade-offs

- **[风险] 过渡期两套前端并存** → 迁移期间保留 `app.js`，通过 FastAPI 路由区分（开发用 Vite，生产暂用旧版）→ 迁移完成后一次切换
- **[风险] API 接口格式假设** → 前端已有 API 调用作为参考，保持相同调用方式即可
- **[风险] Element Plus 样式与现有 CSS 冲突** → Vue 项目有独立 CSS scope，不影响旧 static/ 内容
- **[取舍] 不引入 TypeScript** → 降低迁移门槛，未来可逐步加 JSDoc 或迁移到 TS

## Migration Plan

1. 初始化 `frontend/` 目录，安装依赖，验证 dev server 启动
2. 配置 Vite proxy（/api → :8000）
3. 配置 Vue Router（hash 模式，保持 #/today 等路由不变）
4. 封装 axios API 层（对应现有 api.get/post/patch/delete）
5. 逐页迁移（每页独立 PR/任务）
6. 全部迁移完成后，更新 FastAPI server.py 指向 dist/，删除 static/app.js
