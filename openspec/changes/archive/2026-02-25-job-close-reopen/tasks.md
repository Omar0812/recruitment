## 1. 后端：关闭岗位批量淘汰支持

- [x] 1.1 在 `JobUpdate` schema 中新增 `bulk_reject: Optional[bool] = False` 字段
- [x] 1.2 在 `update_job()` 中，当 `status == "closed"` 且 `bulk_reject == True` 时，将该岗位所有 outcome 为 null 的 links 设为 `rejected`，`rejection_reason` 写"岗位关闭"
- [x] 1.3 验证：批量淘汰后流程跟进页面这些候选人不再显示为在途

## 2. 前端：关闭按钮逻辑改造

- [x] 2.1 关闭按钮点击后，先读取当前岗位的 `active_count`（列表渲染时已有此数据）
- [x] 2.2 若 `active_count == 0`，直接调 `PATCH /api/jobs/{id}` 关闭，无需弹窗
- [x] 2.3 若 `active_count > 0`，弹出自定义确认弹窗，显示"该岗位还有 N 名候选人在流程中"，提供"批量淘汰并关闭"和"仅关闭岗位"两个按钮
- [x] 2.4 "批量淘汰并关闭"调 `PATCH /api/jobs/{id}` 传 `{ status: "closed", bulk_reject: true }`
- [x] 2.5 "仅关闭岗位"调 `PATCH /api/jobs/{id}` 传 `{ status: "closed" }`

## 3. 前端：重新打开按钮

- [x] 3.1 在岗位列表渲染中，已关闭岗位操作列新增"重新打开"按钮（替换"关闭"按钮位置）
- [x] 3.2 点击"重新打开"调 `PATCH /api/jobs/{id}` 传 `{ status: "open" }`，刷新列表
- [x] 3.3 验证：重新打开后岗位出现在招聘中列表，"显示已关闭"未勾选时不显示该岗位
