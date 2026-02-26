## 1. 后端：数据模型与迁移

- [x] 1.1 在 `app/models.py` 中为 ActivityRecord.type 添加 `resume_review` 合法值注释（无需改表结构）
- [x] 1.2 编写迁移脚本 `scripts/migrate_resume_review.py`：为所有无 resume_review 活动的 CandidateJobLink 补创建 resume_review 活动（status=completed, conclusion=通过, created_at=link.created_at）
- [x] 1.3 本地运行迁移脚本，验证存量数据正确

## 2. 后端：活动链约束

- [x] 2.1 在 `app/routes/activities.py` 的 `create_activity` 中实现链尾校验：若 link 的最后一个非 note、非 stage_change 活动无 conclusion 且 status 不是 completed/cancelled，返回 400
- [x] 2.2 `ActivityCreate.stage` 改为 `Optional[str] = None`（修复备注无法保存的 bug）
- [x] 2.3 实现 `derive_stage(link_id, db)` 工具函数：从活动链尾推导 stage 字符串
- [x] 2.4 在 `create_activity` 和 `update_activity` 末尾调用 `derive_stage`，自动更新 `CandidateJobLink.stage`

## 3. 后端：link 创建时自动生成 resume_review

- [x] 3.1 在 `app/routes/pipeline.py` 的创建 link 接口中，原子性地创建 resume_review 活动（status=pending, stage=简历筛选）
- [x] 3.2 废弃 stage 手动更新接口（`PATCH /api/pipeline/link/{id}/stage`）：返回 410 或直接移除

## 4. 前端：进行中页面——当前节点操作台

- [x] 4.1 移除展开行中的 stage 下拉选择器
- [x] 4.2 实现 `getCurrentTailActivity(activities)` 函数：返回最后一个非 note、非 stage_change 活动
- [x] 4.3 重写展开行渲染：历史节点只读展示，尾节点显示操作按钮
- [x] 4.4 resume_review 节点渲染：显示 [通过] [淘汰] 两个按钮；点击通过 → PATCH activity conclusion=通过；点击淘汰 → 触发淘汰原因弹窗

## 5. 前端：完成节点后的"选择下一步"

- [x] 5.1 活动完成（conclusion=通过）后，展开行末尾显示"选择下一步"内联提示
- [x] 5.2 下一步选项根据当前尾节点类型动态生成：
  - resume_review/phone_screen 通过 → [电话初筛] [面试] [直接Offer]
  - interview 通过 → [下一轮面试] [Offer]
  - offer 接受 → 触发入职确认弹窗
- [x] 5.3 选择下一步后直接展示对应活动表单（inline），不再需要单独"添加活动"按钮
- [x] 5.4 保留 [+ 备注] 按钮，始终可见，不受链状态影响

## 6. 前端：进度点与历史展示

- [x] 6.1 进度点渲染过滤掉 stage_change 类型活动
- [x] 6.2 resume_review 节点在进度点中显示为"简历筛选"标签
- [x] 6.3 历史节点（非尾节点）只读展示：显示类型、结论、评分、备注，无编辑按钮

## 7. 前端：其他联动修复

- [x] 7.1 人才库 tab 中的 stage 标签改为直接读取 `link.stage`（后端已自动维护，无需前端计算）
- [x] 7.2 按阶段分组视图：stage 分组 key 直接用 `link.stage`，无需额外处理
- [x] 7.3 修复备注活动无法保存的 bug（依赖 2.2 完成后自动修复，前端侧验证）

## 8. 测试与收尾

- [x] 8.1 验证：新候选人进入岗位后自动出现 resume_review 节点
- [x] 8.2 验证：resume_review 通过后可选下一步，跳过电话初筛直接面试正常
- [x] 8.3 验证：链尾未完成时添加新活动被拒绝（前端不显示选项，后端返回 400）
- [x] 8.4 验证：备注随时可添加，不影响流程
- [x] 8.5 验证：存量数据迁移后，所有 links 的 stage 显示正常
