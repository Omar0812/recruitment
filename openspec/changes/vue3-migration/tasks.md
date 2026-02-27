## 1. 项目骨架初始化

- [ ] 1.1 在 `frontend/` 目录执行 `npm create vue@latest .`，选择 Vue 3 + Vue Router + Pinia（不选 TypeScript）
- [ ] 1.2 安装依赖：`npm install element-plus axios`
- [ ] 1.3 安装按需引入插件：`npm install -D unplugin-vue-components unplugin-auto-import`
- [ ] 1.4 配置 `vite.config.js`：加入 Element Plus 自动引入插件 + `/api` 代理到 `http://localhost:8000`
- [ ] 1.5 在 `main.js` 中引入 Element Plus（全量引入作为临时方案，后续改为按需）
- [ ] 1.6 验证：`npm run dev` 启动，访问 http://localhost:5173 显示 Vue 应用

## 2. 路由配置

- [ ] 2.1 配置 `frontend/src/router/index.js`，使用 `createWebHashHistory`（hash 模式）
- [ ] 2.2 添加路由：`/today`、`/pipeline`、`/talent`、`/jobs`、`/hired`、`/suppliers`、`/analytics`、`/settings`
- [ ] 2.3 默认路由（`/`）重定向到 `/today`
- [ ] 2.4 在 `App.vue` 中添加 `<router-view>` 和顶部导航栏组件

## 3. API 层封装

- [ ] 3.1 创建 `frontend/src/api/base.js`：axios 实例，配置 baseURL、请求拦截、响应拦截（错误自动 ElMessage）
- [ ] 3.2 修复 DELETE 支持 body：在 axios 实例封装中确保 delete 方法可传 data
- [ ] 3.3 创建 `frontend/src/api/candidates.js`：list、get、create、update、blacklist、unblacklist、checkDuplicate
- [ ] 3.4 创建 `frontend/src/api/jobs.js`：list、get、create、update、close、reopen
- [ ] 3.5 创建 `frontend/src/api/pipeline.js`：getActive、getHired、link、outcome、withdraw、hire、transfer、notes
- [ ] 3.6 创建 `frontend/src/api/activities.js`：list、create、update、delete
- [ ] 3.7 创建 `frontend/src/api/insights.js`：getToday
- [ ] 3.8 创建 `frontend/src/api/suppliers.js`：list、create、update、delete
- [ ] 3.9 创建 `frontend/src/api/settings.js`：getAi、updateAi、verifyAi
- [ ] 3.10 创建 `frontend/src/api/utils.js`：withLoading 函数

## 4. 共享组件

- [ ] 4.1 创建 `frontend/src/components/ActivityCard.vue`：根据 type 渲染面试/offer/note/resume_review/background_check 卡片
- [ ] 4.2 创建 `frontend/src/components/ActivityForm.vue`：根据 type 动态显示对应表单字段，提交调用 activities.create
- [ ] 4.3 创建 `frontend/src/components/ConfirmDialog.vue`：通用确认弹窗，支持自定义标题/内容/确认回调
- [ ] 4.4 创建 `frontend/src/components/AppNav.vue`：顶部导航栏，高亮当前路由

## 5. Pinia Stores

- [ ] 5.1 创建 `frontend/src/stores/today.js`：todayItems、weekSummary、fetchToday action
- [ ] 5.2 创建 `frontend/src/stores/pipeline.js`：activeLinks、fetchActive、removeLink action（本地移除）
- [ ] 5.3 创建 `frontend/src/stores/shared.js`：jobs 列表、suppliers 列表（跨页面共享）

## 6. 今日待办页面（优先）

- [ ] 6.1 创建 `frontend/src/pages/Today.vue`，连接 todayStore，展示 P0/P1/P2 分组待办列表
- [ ] 6.2 实现本周概览折叠区（ElCollapse 或 ElCard）
- [ ] 6.3 实现 P0 面试卡片展开（显示 last_interview_summary 和操作入口）
- [ ] 6.4 实现 P1/P2 待办项点击直接弹出操作面板（复用 ActivityForm）
- [ ] 6.5 验证：今日待办页面功能与原 app.js renderTodayPage 一致

## 7. 进行中流程页面

- [ ] 7.1 创建 `frontend/src/pages/Pipeline.vue`，连接 pipelineStore，展示分组候选人列表
- [ ] 7.2 实现候选人卡片展开区 A/B/C/D 四态逻辑（根据当前 tail activity 状态判断）
- [ ] 7.3 实现内联备注表单（展开/收起）
- [ ] 7.4 实现内联退出表单（展开原因选择）
- [ ] 7.5 实现内联淘汰表单（展开原因选择）
- [ ] 7.6 操作完成后局部更新列表（不全页刷新）
- [ ] 7.7 验证：进行中页面功能与原 app.js renderPipelinePage 一致

## 8. 人才库页面

- [ ] 8.1 创建 `frontend/src/pages/Talent.vue`，展示候选人卡片列表
- [ ] 8.2 实现搜索框（防抖，250ms）、学历筛选、来源筛选、星标筛选
- [ ] 8.3 实现简历上传导入入口（调用 /api/resume/upload）
- [ ] 8.4 点击候选人打开 CandidateDetail 组件
- [ ] 8.5 验证：人才库页面功能完整

## 9. 岗位管理页面

- [ ] 9.1 创建 `frontend/src/pages/Jobs.vue`，展示岗位列表（ElTable 或 ElCard）
- [ ] 9.2 实现新建/编辑岗位 ElDialog 表单
- [ ] 9.3 实现关闭岗位流程（在途候选人处理弹窗）
- [ ] 9.4 实现复制岗位（预填表单新建）
- [ ] 9.5 验证：岗位管理功能完整

## 10. 候选人详情组件

- [ ] 10.1 创建 `frontend/src/components/CandidateDetail.vue`，使用 ElDrawer 从右侧滑出
- [ ] 10.2 实现基本信息展示和编辑模式切换
- [ ] 10.3 实现活动时间线（复用 ActivityCard 组件）
- [ ] 10.4 实现简历预览（PDF iframe / DOCX HTML）
- [ ] 10.5 实现黑名单操作（加入/解除）
- [ ] 10.6 实现加入流程操作（选择岗位）
- [ ] 10.7 验证：候选人详情功能与原版一致

## 11. 其余页面

- [ ] 11.1 创建 `frontend/src/pages/Hired.vue`，展示已入职列表，担保期状态标签
- [ ] 11.2 创建 `frontend/src/pages/Suppliers.vue`，展示供应商列表，新建/编辑表单
- [ ] 11.3 创建 `frontend/src/pages/Analytics.vue`，展示招聘漏斗数据
- [ ] 11.4 创建 `frontend/src/pages/Settings.vue`，AI 配置表单，测试连接按钮

## 12. 生产集成与清理

- [ ] 12.1 执行 `npm run build`，验证 `frontend/dist/` 生成正确
- [ ] 12.2 修改 `app/server.py`：将 `/` 路由指向 `frontend/dist/index.html`，挂载 `frontend/dist` 为静态目录
- [ ] 12.3 验证生产模式（只启动 FastAPI，访问 http://localhost:8000 显示 Vue 应用）
- [ ] 12.4 删除 `static/app.js` 和 `static/lib/`（确认 Vue 版本完整覆盖所有功能后）
- [ ] 12.5 更新 `启动.command`，在启动前执行 `cd frontend && npm run build`（可选，开发期间跳过）
