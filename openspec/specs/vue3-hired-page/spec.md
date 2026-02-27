## ADDED Requirements

### Requirement: 已入职页面 Vue 组件
`frontend/src/pages/Hired.vue` SHALL 实现已入职页面，对应现有 `#/hired` 路由，展示所有 outcome=hired 的候选人。

#### Scenario: 已入职列表展示
- **WHEN** 用户访问 `/#/hired`
- **THEN** 调用 `GET /api/pipeline/hired`，展示入职候选人列表（含姓名、岗位、入职时间、来源渠道）

#### Scenario: 担保期状态显示
- **WHEN** 候选人来源为猎头供应商且有 fee_guarantee_days
- **THEN** 显示担保期剩余天数或「已过担保期」标签
