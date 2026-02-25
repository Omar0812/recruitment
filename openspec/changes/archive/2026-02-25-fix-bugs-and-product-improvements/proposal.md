## Why

经过全面的 HR 使用场景模拟和代码审查，发现系统存在 4 个严重 Bug（其中 1 个导致新建候选人功能完全不可用）、7 个中等 Bug 以及多项产品体验问题。这些问题影响核心工作流，需要集中修复。

## What Changes

- **修复 `f-tags` 元素缺失**：上传简历弹窗中调用了不存在的 `#f-tags` 输入框，导致新建候选人时 JS 报错、保存失败
- **修复 `link_to_dict` 缺少 `rejection_reason`**：淘汰原因字段未序列化，看板卡片上淘汰原因标签永远不显示
- **修复软删除候选人仍出现在看板和查重中**：`get_pipeline` 和 `check_duplicate` 未过滤 `deleted_at IS NULL`
- **修复查重合并后人才库不刷新**：`mergeCandidate` 中用 `getElementById("main")` 找不到元素（实际 id 不存在）
- **修复备注弹窗不预填已有内容**：每次打开备注弹窗都清空，用户会意外覆盖已有备注
- **修复事件监听器重复叠加**：`renderPipeline` 每次重渲染都给弹窗按钮追加新监听器，导致 API 重复调用
- **修复流程跟进页搜索 null 崩溃**：`candidate_name` 为 null 时 `.toLowerCase()` 报错
- **修复候选人编辑弹窗缺少城市字段**：编辑表单无城市输入，无法通过 UI 修改城市
- **修复 `years_exp` 用 `parseInt` 丢失小数**：上传表单中应使用 `parseFloat`
- **修复重复投递同一岗位无防护**：后端 `POST /api/pipeline/link` 不检查是否已存在相同关联
- **修复 `display_name` 显示 "None"**：当 name 和 name_en 都为 null 时 f-string 输出字符串 "None"
- **时间戳本地化**：所有时间显示从 UTC 转为 UTC+8（中国本地时间）

## Capabilities

### New Capabilities
- `pipeline-data-integrity`: 看板和查重接口过滤软删除候选人；重复投递防护
- `candidate-edit-enhancements`: 候选人编辑弹窗补充城市字段；years_exp parseFloat 修复；display_name null 修复
- `timestamp-localization`: 前端所有时间戳统一转换为本地时间显示

### Modified Capabilities
- `import-form-ux`: 补充 `#f-tags` 技能标签输入框（当前调用但不存在）
- `rejection-reason`: `link_to_dict` 序列化补充 `rejection_reason` 字段
- `resume-dedup`: `check_duplicate` 过滤软删除候选人；合并后正确刷新人才库列表
- `pipeline-kanban`: 修复事件监听器叠加；备注弹窗预填已有内容
- `pipeline-tracking-page`: 搜索时 `candidate_name` null 安全处理

## Impact

- **后端**：`app/routes/pipeline.py`（link_to_dict、get_pipeline、link_candidate）、`app/routes/candidates.py`（check_duplicate、display_name）
- **前端**：`static/app.js`（uploadAndConfirm、renderPipeline、renderPipelineTracking、mergeCandidate、所有时间显示）
- **无破坏性变更**：所有修改均向后兼容，不涉及数据库结构变更
