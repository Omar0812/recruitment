## 1. 后端 Bug 修复

- [x] 1.1 `pipeline.py` `link_to_dict` 补充 `rejection_reason` 字段序列化
- [x] 1.2 `pipeline.py` `get_pipeline` 过滤软删除候选人（检查 `lnk.candidate.deleted_at is None`）
- [x] 1.3 `pipeline.py` `link_candidate` 检查重复活跃关联，若存在返回 400
- [x] 1.4 `candidates.py` `check_duplicate` 查询补充 `Candidate.deleted_at.is_(None)` 过滤
- [x] 1.5 `candidates.py` `candidate_to_dict` 修复 `display_name`：name 和 name_en 均为 null 时返回 `@{display_id}`

## 2. 前端严重 Bug 修复

- [x] 2.1 `uploadAndConfirm` 表单中补充 `<input id="f-tags" placeholder="技能标签，逗号分隔">` 输入框
- [x] 2.2 `mergeCandidate` 修复人才库刷新：将 `getElementById("main")` 改为正确获取 `page-content` 元素并调用 `renderTalentPool`

## 3. 前端中等 Bug 修复

- [x] 3.1 `renderPipeline` 备注弹窗打开时预填当前备注：`document.getElementById("note-input").value = lnk.notes || ""`
- [x] 3.2 `renderPipeline` 所有弹窗确认按钮（`note-confirm`、`reject-confirm`、`iv-confirm`）改用 `onclick =` 赋值，避免事件叠加
- [x] 3.3 `renderPipelineTracking` 搜索过滤改为 `(l.candidate_name || "").toLowerCase().includes(q)`
- [x] 3.4 候选人编辑弹窗（`edit-info-btn` onclick）补充城市字段：`<input id="e-city">` 并在 PATCH 时包含 `city`
- [x] 3.5 `uploadAndConfirm` 保存时 `years_exp` 改用 `parseFloat` 替代 `parseInt`

## 4. 时间戳本地化

- [x] 4.1 `app.js` 顶部添加工具函数 `formatTime(isoStr)` 将 UTC ISO 字符串转为本地时间 `YYYY-MM-DD HH:mm`
- [x] 4.2 候选人历史记录时间戳替换为 `formatTime(h.timestamp)`
- [x] 4.3 看板卡片 `days_since_update` 显示保持不变（已是天数差，无需转换）
- [x] 4.4 流程跟进页面时间显示使用 `formatTime`
- [x] 4.5 候选人详情投递记录 `created_at` 使用 `formatTime`
- [x] 4.6 人才库列表 `created_at` 使用 `formatTime`

## 5. 验证

- [ ] 5.1 上传简历 → 填写标签 → 保存候选人，确认无 JS 报错，标签正确保存
- [ ] 5.2 看板淘汰候选人 → 确认淘汰原因标签显示在卡片上
- [ ] 5.3 看板备注弹窗打开 → 确认预填已有备注内容
- [ ] 5.4 看板连续操作多次 → 确认每次只触发一次 API 请求
- [ ] 5.5 查重合并后 → 确认人才库列表刷新，副档案消失
- [ ] 5.6 重复投递同一岗位 → 确认返回错误提示
- [ ] 5.7 候选人编辑弹窗 → 确认城市字段可编辑保存
- [ ] 5.8 所有时间显示 → 确认为本地时间（UTC+8）