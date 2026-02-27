## ADDED Requirements

### Requirement: 人才库页面 Vue 组件
`frontend/src/pages/Talent.vue` SHALL 实现人才库页面，对应现有 `#/talent` 路由，支持搜索、筛选、查看候选人详情。

#### Scenario: 候选人列表展示
- **WHEN** 用户访问 `/#/talent`
- **THEN** 调用 `GET /api/candidates`，展示候选人卡片列表（含姓名、当前状态、标签、来源）

#### Scenario: 搜索过滤
- **WHEN** 用户在搜索框输入关键词
- **THEN** 列表实时过滤（或重新请求 /api/candidates?q=），展示匹配候选人

#### Scenario: 黑名单显示切换
- **WHEN** 用户勾选「显示黑名单」
- **THEN** 调用 `GET /api/candidates?show_blacklisted=true`，显示黑名单候选人（红色标识）
