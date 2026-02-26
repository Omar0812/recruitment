## 1. 进行中页本地状态修复

- [x] 1.1 `openWithdrawOverlay` 的 onSuccess 回调前，从 `links` 数组 splice 移除对应 linkId 条目
- [x] 1.2 `openHireOverlay` 的 onSuccess 回调前，从 `links` 数组 splice 移除对应 linkId 条目

## 2. 阶段下拉重复"已入职"修复

- [x] 2.1 `renderExpandInner` 中渲染 stageOptions 时过滤掉值为"已入职"的 stage，再追加 `__hire__` 选项

## 3. 删除看板页面

- [x] 3.1 `static/app.js`：删除 `renderPipeline` 函数及其所有辅助函数（`renderCard`、`loadInterviewList` 等仅被看板使用的函数）
- [x] 3.2 `static/app.js`：删除路由中 `#/jobs/pipeline/` 的匹配分支
- [x] 3.3 `static/app.js`：搜索所有 `#/jobs/pipeline/` 链接引用，替换为 `#/pipeline` 或删除

## 4. 岗位详情招聘进展 tab 改只读

- [x] 4.1 `static/app.js`：`renderJobDetail` 招聘进展 tab 移除所有操作按钮（推进/淘汰/面试等），改为纯候选人名单展示
- [x] 4.2 每个候选人条目添加"→ 前往进行中页"链接指向 `#/pipeline`
