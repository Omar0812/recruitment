## ADDED Requirements

### Requirement: 岗位管理页面 Vue 组件
`frontend/src/pages/Jobs.vue` SHALL 实现岗位管理页面，对应现有 `#/jobs` 路由，支持岗位列表、新建、编辑、关闭、复制。

#### Scenario: 岗位列表展示
- **WHEN** 用户访问 `/#/jobs`
- **THEN** 调用 `GET /api/jobs`，展示岗位列表（含在途人数、已入职人数、优先级、状态）

#### Scenario: 新建岗位
- **WHEN** 用户点击「新建岗位」
- **THEN** 弹出 Element Plus ElDialog 表单，填写后调用 `POST /api/jobs` 创建

#### Scenario: 关闭岗位
- **WHEN** 用户点击「关闭岗位」，且有在途候选人
- **THEN** 显示在途候选人列表，提示逐一处理或批量退出后关闭

#### Scenario: 复制岗位
- **WHEN** 用户点击「复制岗位」
- **THEN** 以当前岗位信息预填表单，新建一个副本（不含候选人）
