## Context

岗位关闭流程目前只有一个 `confirm()` 弹窗，直接将 status 改为 closed，不处理仍在流程中的候选人。已关闭岗位没有重新打开的入口，需要重新创建岗位。

`CandidateJobLink` 的 `outcome` 字段为 null 表示在途，`rejected`/`withdrawn`/`offer` 表示已结束。关闭岗位时需要处理 outcome 为 null 的 links。

## Goals / Non-Goals

**Goals:**
- 关闭岗位前检查在途候选人数量，若有则弹窗提示并提供批量淘汰选项
- 已关闭岗位显示"重新打开"按钮，点击后恢复为 open

**Non-Goals:**
- 不自动处理候选人，必须由 HR 主动选择
- 不改变单个候选人的淘汰流程（面评等）
- 不处理暂停状态的岗位

## Decisions

**关闭弹窗**：前端关闭按钮点击后，先调 `GET /api/jobs/{id}/pipeline-summary` 获取在途人数。若为 0 直接关闭；若 > 0 弹窗显示人数，提供两个选项："批量淘汰并关闭"和"仅关闭岗位（保留流程）"。

**批量淘汰**：后端 `PATCH /api/jobs/{id}` 扩展，支持 `status: "closed"` 同时传 `bulk_reject: true`，将该岗位所有 outcome 为 null 的 links 设为 `rejected`，`rejection_reason` 统一写"岗位关闭"。复用现有 pipeline 逻辑，不新增接口。

**重新打开**：前端在已关闭岗位行显示"重新打开"按钮，调 `PATCH /api/jobs/{id}` 传 `{ status: "open" }`，后端已支持，无需改动。

**pipeline-summary 接口**：在 `GET /api/jobs/{id}` 返回值中已有 `active_count`，前端直接用，不需要新接口。

## Risks / Trade-offs

- [批量淘汰不可撤销] → 弹窗明确提示"将淘汰 N 名候选人，此操作不可撤销"
- [重新打开后历史流程数据] → 保留原有 links 不变，重新打开后可继续投递新候选人
