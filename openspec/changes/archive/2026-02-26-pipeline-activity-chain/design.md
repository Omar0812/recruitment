## Context

当前系统中 `CandidateJobLink.stage` 是一个独立字段，需要用户手动维护。`ActivityRecord` 是另一条独立轨道。两者需要手动同步，导致：
- 简历筛选是"状态"而非"动作"，无法直接标记结果
- 推进流程需要"改 stage + 添加活动"两步操作
- 没有约束阻止在未完成的活动上继续添加新活动
- `stage_change` 活动类型是冗余的，只是为了记录 stage 变更

新模型：**活动链（Activity Chain）**。候选人在岗位中的流程是一条单向活动链，stage 从链尾派生，不再独立存储。

## Goals / Non-Goals

**Goals:**
- 活动链单向约束：链尾未完成不能添加新节点
- `resume_review` 作为入口节点，进入岗位时自动创建
- `stage` 从活动链派生，不再手动写入
- 进行中页面 UX 简化：去掉 stage 下拉，改为"完成当前节点 → 选下一步"
- `note` 活动游离于链之外，随时可添加，不影响流程推进

**Non-Goals:**
- 不改变候选人跨岗位并行的逻辑（每个 link 独立）
- 不改变 outcome（rejected/withdrawn/hired）的逻辑
- 不改变仪表盘统计逻辑（stage 派生后统计结果不变）
- 不做数据导出

## Decisions

### 决策 1：stage 完全派生，不存储

**选择**：`CandidateJobLink.stage` 保留字段但改为由后端在每次活动变更时自动更新，前端不再直接写入。

**派生规则**：
```
最后一个非 note、非 stage_change 活动的类型 → stage 标签
  resume_review → "简历筛选"
  phone_screen  → "电话初筛"
  interview     → round 值（"一面"/"二面"/...）
  offer         → "Offer"
  无活动        → "待处理"
```

**备选方案**：完全不存储 stage，每次查询时实时计算。
**否决原因**：现有大量查询依赖 `stage` 字段过滤和排序，实时计算需要 JOIN 活动表，改动范围过大。保留字段但自动维护是最小改动路径。

### 决策 2：链尾约束在后端强制

**选择**：`POST /api/activities` 时，后端检查该 link 的最后一个非 note 活动是否已完成（有 conclusion 或 status=completed/cancelled）。未完成则返回 400。

**备选方案**：仅在前端约束，后端不校验。
**否决原因**：前端约束可绕过，数据完整性无法保证。

### 决策 3：resume_review 在 link 创建时自动生成

**选择**：`POST /api/pipeline/link`（候选人进入岗位）时，后端原子性地创建 `resume_review` 活动，status=`pending`。

**备选方案**：前端创建 link 后再单独调用创建活动接口。
**否决原因**：两步操作有失败风险，且前端逻辑复杂。后端原子操作更可靠。

### 决策 4：stage_change 类型直接删除

**选择**：新代码不再创建 `stage_change` 类型活动。历史数据保留（不删除），但 UI 不再渲染。

**备选方案**：保留类型但标记为 deprecated。
**否决原因**：stage_change 的语义在新模型中完全消失，保留只会造成混淆。

### 决策 5：note 活动不参与链约束

**选择**：`note` 类型活动随时可创建，不受链尾约束，不影响 stage 派生。

**理由**：备注是跟进记录，不是流程节点。任何时候都应该可以写备注。

## Risks / Trade-offs

**存量数据迁移** → 现有 links 有 stage 字段但没有 resume_review 活动。
迁移方案：写一次性迁移脚本，为所有现有 links 补创建 resume_review 活动（status=`completed`，conclusion=`通过`，created_at 设为 link.created_at）。

**stage 字段短暂不一致** → 如果后端更新 stage 失败，字段值会滞后。
缓解：stage 更新与活动创建在同一事务中完成。

**前端改动量大** → 进行中页面是核心页面，重构风险高。
缓解：保持 API 接口兼容，只改前端渲染逻辑；分模块测试。

## Migration Plan

1. 后端先上：新增 resume_review 类型支持，链尾约束，stage 自动更新
2. 运行迁移脚本：为存量 links 补 resume_review 活动
3. 前端跟上：去掉 stage 下拉，重写进行中页面卡片
4. 回滚：stage 字段保留，迁移脚本可逆（删除补创建的 resume_review 活动）

## Open Questions

- `resume_review` 通过后，下一步选项是否需要限制顺序（比如必须先电话初筛才能面试）？当前设计是自由选择，跳过即跳过。
- 面试轮次（一面/二面）的自动命名逻辑是否保持不变？
