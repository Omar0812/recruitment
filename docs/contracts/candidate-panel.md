# 候选人面板（Candidate Panel）

> 跨页面右侧浮层，关注「人」的档案层。查看/编辑候选人信息、简历附件、流程记录，执行推荐到岗位、黑名单、标记离职等操作。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/candidates/{id}` | 候选人详情 |
| GET | `/applications?candidate_id={id}` | 候选人的所有 Application（page_size=100） |
| POST | `/actions/execute` | 统一动作入口，action_code 见下方 |
| POST | `/candidates/check-duplicate` | 手动查重 |
| GET | `/suppliers/{id}` | 获取关联猎头信息（担保期检查用） |
| GET | `/events?application_id={id}` | 获取 Application 事件（标记离职担保期检查用） |

**面板调用的 action_code 清单**：

| action_code | target_type | 说明 |
|-------------|-------------|------|
| `create_application` | candidate | 推荐到岗位（创建 Application，payload: {job_id}） |
| `update_candidate` | candidate | 编辑候选人信息（payload: 可变字段 dict） |
| `blacklist_candidate` | candidate | 加入黑名单（payload: {reason, note?}） |
| `unblacklist_candidate` | candidate | 解除黑名单 |
| `record_left` | application | 标记离职（target_id = 最新 HIRED Application ID） |

## 页面

组件 `CandidatePanel.vue`（Teleport to body，右侧滑入 480px），Composable `useCandidatePanel.ts`

**调用入口**（所有能打开面板的页面）：
- 人才库：点击候选人卡片
- 进行中：点击候选人名字
- 岗位面板：候选人 Tab 点击候选人名字（带 `returnToJobId`，可 [← 返回岗位]）
- 已入职：点击行

**三个 Tab**：
1. **基本信息**（`BasicInfoTab.vue`）：手机/邮箱/学历/学校/年限/年龄/技能/来源/经历/备注。支持编辑模式（就地表单）。黑名单候选人顶部显示原因+备注
2. **简历**（`ResumeTab.vue`）：附件列表，支持 iframe 预览（fetch + blob URL 认证方式）和添加/删除附件，下载通过 fetch + blob URL 触发。简历创建日期显示 `YYYY-MM-DD`（调用 `utils/date.ts` 的 `formatDate`）

3. **流程记录**（`ApplicationHistoryTab.vue` → `ApplicationRecord.vue`）：按 Application 分组，每条显示岗位名+状态+事件列表。事件日期显示 `MM-DD`（调用 `utils/date.ts` 的 `formatShortDate`）。关联猎头时显示猎头名称

**底部操作栏**（常驻，按 candidateStatus 动态变化）：

| 状态 | 操作 |
|------|------|
| idle（无流程） | [查重] [编辑信息] [推荐到岗位] [加入黑名单] |
| in_progress | [查重] [编辑信息] [加入黑名单] |
| hired | [查重] [编辑信息] [标记离职] |
| left（已离职） | [查重] [编辑信息] [推荐到岗位] [加入黑名单] |
| blacklisted | [查重] [编辑信息] [解除黑名单] |

## 业务规则

- **状态判定优先级**：blacklisted > in_progress > hired > left > idle（`candidateStatus` computed）
- **加入黑名单**（`BlacklistConfirm.vue`）：内联确认区，必须选原因（简历造假/态度问题/背调不通过/多次爽约/其他），备注选填。确认后 `blacklist_candidate` action
- **解除黑名单**：直接执行 `unblacklist_candidate`，清除 blacklisted/reason/note 三字段
- **推荐到岗位**（`JoinPipelineInline.vue`）：选择 open 岗位 → `create_application` action → 面板关闭 → 跳转 `/pipeline?expand={application_id}`
  - 约束：候选人已有 IN_PROGRESS Application 时后端拒绝（`candidate_already_in_progress`）
- **标记离职**：取最新 HIRED Application → `record_left` action
  - 担保期检查：若候选人关联猎头且有 guarantee_months，检查 hire_confirmed 事件日期。担保期内弹 confirm 提示猎头费退还风险
- **编辑信息**：切换为编辑模式（`editing=true`），保存时通过 `update_candidate` action，可变字段白名单见 `_CANDIDATE_MUTABLE_FIELDS`
- **手动查重**（`DuplicateResult.vue`）：用当前候选人姓名+手机+邮箱查重，结果排除自身，内联展示匹配项（可忽略）
- **mutation 通知**：修改操作后 `markMutation` 递增 version，外部页面（如人才库）监听 `candidatePanelMutationState.version` 变化自动刷新列表
- **返回岗位**：从岗位面板进入时，关闭候选人面板 → 重新打开岗位面板（candidates Tab）

## 与其他模块的交互

- **人才库**：mutation 后自动刷新列表；黑名单/星标状态同步
- **进行中**：[推荐到岗位] → 创建 Application → 跳转进行中页面
- **岗位面板**：从候选人 Tab 进入时可 [← 返回岗位]（returnToJobId 机制）
- **已入职**：点击行打开面板，可 [标记离职]
- **渠道页**：猎头信息从 Supplier 表获取（担保期检查）

## ⚠️ spec 与代码差异

- **条件操作「已入职」**：spec 写「已入职 → 无[加入黑名单][推荐到岗位]」，代码一致（hired 状态只显示 [查重][编辑信息][标记离职]）
- **条件操作「已离职」**：spec 写「已离职 → [编辑信息][查重][加入黑名单][推荐到岗位]」，代码一致（left 状态 = idle 分支同逻辑）
- **查重合并操作**：spec 有 [合并] 按钮，代码中面板查重只展示结果和 [忽略]，无合并功能（合并仅在新建候选人流程中可用）
- **流程记录展开/折叠**：spec 要求「进行中流程默认展开，历史折叠」，代码中 `ApplicationHistoryTab` 的展开逻辑待确认具体实现
