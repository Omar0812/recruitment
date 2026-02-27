## ADDED Requirements

### Requirement: 今日待办页面 Vue 组件
`frontend/src/pages/Today.vue` SHALL 实现今日待办页面，对应现有 `#/today` 路由，功能与原 `app.js` 的 `renderTodayPage` 完全一致。

#### Scenario: 页面加载显示待办列表
- **WHEN** 用户访问 `/#/today`
- **THEN** 调用 `GET /api/insights/today`，展示 P0/P1/P2 分优先级的待办项列表

#### Scenario: 本周概览折叠区
- **WHEN** 页面加载完成
- **THEN** 顶部显示本周概览（进行中人数、本周面试数、待回复 offer、本周入职）

### Requirement: P0 面试卡片展开交互
今日待办中的 P0 面试卡片 SHALL 支持点击展开，显示候选人简历摘要、上轮面评摘要和操作入口。

#### Scenario: 点击面试卡片展开
- **WHEN** 用户点击 P0 interview_today 类型的待办卡片
- **THEN** 展开区显示候选人信息、上轮面评（last_interview_summary）、跳转到候选人详情的按钮

### Requirement: 待办项点击直接弹操作
今日待办中的 P1/P2 待办项 SHALL 支持点击直接弹出操作弹窗，不跳转页面。

#### Scenario: 点击 P1 停滞提醒
- **WHEN** 用户点击 pipeline_stale 类型待办项
- **THEN** 弹出该候选人的流程操作面板（与进行中页面的展开区一致）
