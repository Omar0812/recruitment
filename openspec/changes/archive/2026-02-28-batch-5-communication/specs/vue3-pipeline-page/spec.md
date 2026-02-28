## MODIFIED Requirements

### Requirement: 进行中流程页面 Vue 组件
`frontend/src/pages/Pipeline.vue` SHALL 实现进行中流程页面，对应现有 `#/pipeline` 路由，功能与原 `app.js` 的 `renderPipelinePage` 完全一致。展开区 SHALL 新增「复制简历摘要」按钮和邀约邮件发送入口。

#### Scenario: 页面加载显示进行中列表
- **WHEN** 用户访问 `/#/pipeline`
- **THEN** 调用 `GET /api/pipeline/active`，展示所有进行中候选人的分组列表

#### Scenario: 候选人卡片展开（A/B/C/D 四态）
- **WHEN** 用户点击候选人卡片
- **THEN** 展开区按 A（简历筛选待审）/ B（面试中）/ C（Offer阶段）/ D（通用操作）四态显示不同内容

### Requirement: 内联操作表单
展开区底部操作栏 SHALL 支持内联展开备注、退出、淘汰表单，无需打开独立弹窗。

#### Scenario: 内联添加备注
- **WHEN** 用户点击「备注」按钮
- **THEN** 在操作栏内展开备注输入框，提交后收起

#### Scenario: 内联退出/淘汰
- **WHEN** 用户点击「退出」或「淘汰」按钮
- **THEN** 在操作栏内展开对应表单，填写原因后提交

### Requirement: 进行中列表实时刷新
对候选人执行操作后 SHALL 只刷新受影响的卡片或移除该卡片，不重载整个列表。

#### Scenario: 淘汰后移除卡片
- **WHEN** 用户对某候选人执行淘汰操作
- **THEN** 该候选人卡片从列表中移除，其他卡片不变

### Requirement: 面试卡片邀约邮件发送入口
Pipeline 展开区处于 B 态（面试中）且有已安排面试时，SHALL 显示「发送邀约邮件」按钮。

#### Scenario: 发送邀约邮件入口显示
- **WHEN** 候选人处于面试阶段且有 scheduled 状态的面试记录
- **THEN** 展开区显示「发送邀约邮件」按钮

#### Scenario: 点击发送邀约邮件
- **WHEN** 用户点击「发送邀约邮件」
- **THEN** 弹出确认弹窗，显示候选人邮箱和邮件内容预览，用户确认后发送

### Requirement: 展开区简历摘要复制入口
Pipeline 展开区 SHALL 提供「复制简历摘要」按钮，生成摘要文本复制到剪贴板。

#### Scenario: 复制简历摘要
- **WHEN** 用户在展开区点击「复制简历摘要」
- **THEN** 生成摘要文本写入剪贴板，显示"已复制"toast
