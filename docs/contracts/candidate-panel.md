# 候选人面板（Candidate Panel）

> 跨页面右侧浮层，关注「人」的档案层。查看/编辑候选人信息、简历附件、流程记录，执行推荐到岗位、黑名单、标记离职、**查重合并**等操作。

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
| `merge_candidate` | candidate | 【计划新增】合并候选人（payload: {source_candidate_id}，详见业务规则） |

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
3. **流程记录**（`ApplicationHistoryTab.vue` → `ApplicationRecord.vue`）：按 Application 分组。排序规则：IN_PROGRESS 置顶，其余按 `created_at` 倒序。关联猎头时显示猎头名称
   - **Application header**：`▼ 岗位名  状态  日期`。日期规则：HIRED 状态显示 `hire_date`（从 `hire_confirmed` 事件 payload 读取），其余状态显示 `created_at`。日期格式 `MM-DD`
   - **事件行布局**：`指示符  事件类型  [结论]  摘要信息 ........  操作人  MM-DD`
     - 指示符：有详情（body 或结构化 payload）时显示 `▶`（可展开），无详情时显示 `●`
     - 结论：面评→通过/淘汰、背调→通过/未通过（紧跟事件类型后）
     - 摘要：从 payload 提取关键信息（面试时间·形式·面试官、评分、薪资方案等），超长 ellipsis 截断
     - 操作人：`actor_display_name`，右对齐
     - 日期：`MM-DD`，右对齐（`margin-left: auto` 保证始终靠右）
   - **展开详情**：点击 `▶` 展开为 `▼`，下方缩进显示完整内容——面评原文、Offer 全字段（月薪·月数·总包·入职日期·猎头费）、备注全文等。再次点击折叠
   - **事件摘要逻辑**：复用 Pipeline EventCard 的 `inlineSummary` 提取规则（interview_scheduled → 时间·形式·面试官；interview_feedback → body·评分；offer_recorded → 薪资·入职日期；application_ended → 原因）

**底部操作栏**（常驻，按 candidateStatus 动态变化）：

| 状态 | 操作 |
|------|------|
| idle（无流程） | [查重] [编辑信息] [推荐到岗位] [加入黑名单] |
| in_progress | [查重] [编辑信息] [加入黑名单] |
| hired | [查重] [编辑信息] [标记离职] |
| left（已离职） | [查重] [编辑信息] [推荐到岗位] [加入黑名单] |
| blacklisted | [查重] [编辑信息] [解除黑名单] |

**查重结果与合并流程**（`DuplicateResult.vue`）：【计划变更】

点 [查重] 后内联展示匹配结果，每条匹配项显示：姓名 · display_id · 联系方式 · 匹配原因 · 最近流程。每条匹配项有两个操作：[合并] 和 [忽略]。

点 [合并] → 守卫检查（见业务规则）→ 通过后进入合并确认页：
- 左右并排展示两个候选人摘要（姓名 · 来源 · 状态 · 简历数 · 联系方式）
- 默认当前面板候选人为主档案，可切换方向
- 下方预览合并效果：将转移几条流程记录、几份附件
- [确认合并] 和 [取消]
- 若用户选择对方为主档案 → 合并后面板自动切换到对方

## 业务规则

- **状态判定优先级**：blacklisted > in_progress > hired > left > idle（`candidateStatus` computed）
- **加入黑名单**（`BlacklistConfirm.vue`）：内联确认区，必须选原因（简历造假/态度问题/背调不通过/多次爽约/其他），备注选填。确认后 `blacklist_candidate` action
- **解除黑名单**：直接执行 `unblacklist_candidate`，清除 blacklisted/reason/note 三字段
- **推荐到岗位**（`JoinPipelineInline.vue`）：选择 open 岗位 → `create_application` action → 面板关闭 → 跳转 `/pipeline?expand={application_id}`
  - 约束：候选人已有 IN_PROGRESS Application 时后端拒绝（`candidate_already_in_progress`）
- **标记离职**：取最新 HIRED Application → `record_left` action
  - 担保期检查：若候选人关联猎头且有 guarantee_months，从 `hire_confirmed` 事件 payload.hire_date 起算担保期。担保期内弹 confirm 提示猎头费退还风险
- **编辑信息**：切换为编辑模式（`editing=true`），保存时通过 `update_candidate` action，可变字段白名单见 `_CANDIDATE_MUTABLE_FIELDS`
- **手动查重**（`DuplicateResult.vue`）：用当前候选人姓名+手机+邮箱查重，结果排除自身及已合并记录（`merged_into IS NOT NULL`），内联展示匹配项
- **合并候选人**（`merge_candidate` action）：【计划新增】
  - **守卫规则**（前端检查 + 后端二次校验）：
    - 双方都有 IN_PROGRESS Application → 阻断，提示"请先结束其中一个流程再合并"
    - 任一方 `blacklisted = true` → 阻断，提示"请先处理黑名单状态再合并"
  - **执行逻辑**（后端 `entity_write` 路径，在一个事务内完成）：
    1. 标量字段（phone/email/education/school 等）：主档案有值保留，空字段从被吸收方补充
    2. starred：任一方有星标 → 主档案标星
    3. attachments（JSON 数组）：被吸收方的附件追加到主档案（按 file_path 去重）
    4. Application：被吸收方的所有 Application 的 `candidate_id` 改为主档案 ID
    5. 被吸收方：设 `merged_into = 主档案.id`（不设 `deleted_at`，合并 ≠ 删除）
    6. 审计：`log_audit` 记录合并操作，details 包含双方 ID 和转移的 Application 数量
  - **合并后**：面板刷新显示主档案最新数据，`markMutation` 通知外部列表刷新
- **mutation 通知**：修改操作后 `markMutation` 递增 version，外部页面（如人才库）监听 `candidatePanelMutationState.version` 变化自动刷新列表
- **返回岗位**：从岗位面板进入时，关闭候选人面板 → 重新打开岗位面板（candidates Tab）

## 与其他模块的交互

- **人才库**：mutation 后自动刷新列表；合并后被吸收方从列表消失（`merged_into` 过滤）；黑名单/星标状态同步
- **进行中**：[推荐到岗位] → 创建 Application → 跳转进行中页面；合并后 Application 的 candidate_id 变更，进行中页面下次加载显示主档案的候选人名
- **岗位面板**：从候选人 Tab 进入时可 [← 返回岗位]（returnToJobId 机制）
- **已入职**：点击行打开面板，可 [标记离职]；合并后已入职列表同步更新
- **渠道页**：猎头信息从 Supplier 表获取（担保期检查）
- **新建候选人**：共用 `POST /candidates/check-duplicate` 接口和查重匹配逻辑

## ⚠️ spec 与代码差异

- **流程记录展开/折叠**：IN_PROGRESS 默认展开（`default-expanded` prop），历史折叠，代码已实现
- **查重合并操作**：【计划变更消除此差异】原代码面板查重只有 [忽略]，本次新增 [合并] 按钮及完整合并流程
