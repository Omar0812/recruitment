## ADDED Requirements

### Requirement: 数据分析页面 Vue 组件
`frontend/src/pages/Analytics.vue` SHALL 实现数据分析页面，对应现有 `#/analytics` 路由，展示招聘漏斗数据。

#### Scenario: 各阶段人数统计
- **WHEN** 用户访问 `/#/analytics`
- **THEN** 调用 `GET /api/pipeline/analytics`，以图表或表格形式展示各阶段候选人数分布

#### Scenario: 淘汰原因分布
- **WHEN** 页面加载完成
- **THEN** 展示淘汰原因分布（饼图或列表），帮助识别主要流失节点

#### Scenario: 岗位维度汇总
- **WHEN** 页面加载完成
- **THEN** 每个岗位展示总投递数、活跃数、淘汰数、offer 数
