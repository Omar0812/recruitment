## 1. 后端

- [x] 1.1 在 app/routes/pipeline.py 新增 GET /api/pipeline/active 接口，返回所有 outcome IS NULL 的 CandidateJobLink，含 candidate_name、job_title、stage、days_since_update

## 2. 导航与路由

- [x] 2.1 index.html 导航栏"候选人"改为"流程跟进"，href 改为 `#/pipeline`，data-page 改为 `pipeline`
- [x] 2.2 app.js router 新增 `#/pipeline` 路由指向 renderPipelineTracking()
- [x] 2.3 app.js router `#/candidates` 重定向到 `#/pipeline`

## 3. 流程跟进页面

- [x] 3.1 新增 renderPipelineTracking() 函数，调用 /api/pipeline/active
- [x] 3.2 默认按岗位分组展示，每组显示岗位名+人数，每行显示姓名、阶段、停留天数
- [x] 3.3 新增"按岗位/按阶段"切换按钮，切换分组方式
- [x] 3.4 新增岗位筛选下拉，动态从数据填充

## 4. 首页双视图

- [x] 4.1 renderDashboard() 顶部新增"岗位视图 | 人视图"tab 切换按钮
- [x] 4.2 岗位视图保持现有 dashboard 内容不变
- [x] 4.3 人视图：调用 /api/pipeline/active，按阶段分组展示所有活跃人选，每行显示姓名、所属岗位、停留天数
