## Why

当前系统中，`stage`（阶段）和 `ActivityRecord`（活动）是两条独立轨道，需要手动同步：用户必须先改阶段、再添加活动，操作繁琐且容易不一致。简历筛选是一个"状态"而非"动作"，导致无法直接标记通过/淘汰。整个流程缺乏约束，候选人可以在任意阶段添加任意活动，数据混乱。

## What Changes

- **新增** `resume_review` 活动类型：候选人进入岗位时自动创建，作为流程第一个节点，有通过/淘汰两个结果
- **新增** 活动链约束：链尾活动未完成时，不允许添加新活动（单向、不可并行）
- **移除** stage 下拉操作：不再允许手动改 stage，stage 改为从活动链派生
- **移除** `stage_change` 活动类型：不再需要
- **修改** 进行中页面 UX：去掉 stage 下拉，卡片变为"当前节点操作台"，完成当前节点后选择下一步
- **修改** 活动创建流程：选择下一步时直接选活动类型（电话初筛/面试/Offer），跳过即跳过，无需单独推进阶段
- **BREAKING** `CandidateJobLink.stage` 变为派生字段（从活动链计算），不再手动写入

## Capabilities

### New Capabilities
- `activity-chain`: 活动链模型——单向、不可并行、链尾完成才能添加下一节点；stage 从链尾活动类型派生；resume_review 作为入口节点自动创建

### Modified Capabilities
- `activity-records`: 新增 `resume_review` 类型；移除 `stage_change` 类型；`stage` 字段变为派生（不再在创建时传入）
- `stage-advance-flow`: 完全替换——不再有 stage 下拉，改为"完成当前活动 → 选择下一步活动类型"的链式推进
- `pipeline-tracking-page`: stage 展示改为从活动链派生；进行中卡片改为当前节点操作台样式

## Impact

- `app/models.py`: ActivityRecord 新增 resume_review 类型约束
- `app/routes/activities.py`: 创建活动时校验链尾状态；stage 字段改为 Optional 且后端自动派生
- `app/routes/pipeline.py`: 候选人进入岗位时自动创建 resume_review 活动；stage 更新接口废弃
- `static/app.js`: 进行中页面大幅重构——去掉 stage 下拉，重写活动卡片和添加流程
- `openspec/specs/activity-records/spec.md`: delta spec
- `openspec/specs/stage-advance-flow/spec.md`: delta spec
- `openspec/specs/pipeline-tracking-page/spec.md`: delta spec
