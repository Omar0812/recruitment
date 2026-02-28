## MODIFIED Requirements

### Requirement: 人才库页面 Vue 组件
`frontend/src/pages/Talent.vue` SHALL 实现人才库页面，对应现有 `#/talent` 路由，支持搜索、筛选、查看候选人详情。toolbar 中的「导入简历」按钮 SHALL 替换为「新建候选人」，点击打开 `CreateCandidateDialog` 组件，原有内联 `el-dialog` + `el-upload` 实现 SHALL 删除。

#### Scenario: 候选人列表展示
- **WHEN** 用户访问 `/#/talent`
- **THEN** 调用 `GET /api/candidates`，展示候选人卡片列表（含姓名、当前状态、标签、来源）

#### Scenario: 搜索过滤
- **WHEN** 用户在搜索框输入关键词
- **THEN** 列表实时过滤（或重新请求 /api/candidates?q=），展示匹配候选人

#### Scenario: 点击「新建候选人」打开统一弹窗
- **WHEN** 用户在人才库 toolbar 点击「新建候选人」
- **THEN** 打开 `CreateCandidateDialog` 弹窗，而非原有简历上传 dialog

#### Scenario: 候选人创建成功后刷新列表
- **WHEN** `CreateCandidateDialog` emit `created` 事件
- **THEN** 调用 `fetchCandidates()` 刷新人才库列表
