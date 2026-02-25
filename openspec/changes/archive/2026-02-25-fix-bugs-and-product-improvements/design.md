## Context

招聘管理工具是一个 FastAPI + 原生 JS 单页应用。经过全面代码审查，发现多处 Bug 和体验问题。本次改动涉及前端 `static/app.js`（~1400行）和后端 `app/routes/` 下多个路由文件，属于跨模块修复，无新增外部依赖，无数据库结构变更。

当前问题根因分类：
1. **前端 DOM 引用错误**：调用不存在的元素（`#f-tags`、`#main`）
2. **序列化遗漏**：后端 `link_to_dict` 未包含 `rejection_reason`
3. **查询过滤缺失**：软删除候选人未从看板/查重中排除
4. **事件监听器管理缺失**：弹窗按钮每次重渲染都追加新监听器
5. **时区处理缺失**：所有时间戳存储 UTC，前端未转换

## Goals / Non-Goals

**Goals:**
- 修复所有导致功能不可用的严重 Bug
- 修复中等 Bug，确保数据一致性
- 时间戳统一转换为 UTC+8 显示
- 候选人编辑弹窗补充城市字段

**Non-Goals:**
- 不做数据库 schema 变更
- 不引入新的外部依赖
- 不重构整体架构
- 不做分页（数据量暂不需要）
- 不做数据导出功能

## Decisions

### 决策 1：时间戳本地化在前端处理，不改后端存储
- **选择**：前端统一用一个 `formatTime(isoStr)` 工具函数做 UTC→本地时间转换
- **理由**：后端改动影响面大（所有接口），且 SQLite 存 UTC 是标准做法；前端集中处理更安全
- **替代方案**：后端返回时加 `+08:00` offset → 改动量大，且不适合多时区部署

### 决策 2：事件监听器叠加问题用 `onclick` 赋值替代 `addEventListener`
- **选择**：弹窗确认/取消按钮统一用 `element.onclick = fn` 赋值（覆盖式）
- **理由**：现有代码已大量使用 `onclick`，保持一致；`onclick` 赋值天然覆盖旧监听器，无需手动 `removeEventListener`
- **替代方案**：`removeEventListener` + `addEventListener` → 需要保存函数引用，改动量更大

### 决策 3：`f-tags` 技能标签输入框加回上传表单
- **选择**：在上传简历弹窗（`uploadAndConfirm`）的表单中补充 `<input id="f-tags">` 标签输入框
- **理由**：代码中已有读取和处理逻辑，只是 DOM 元素缺失；补充输入框是最小改动
- **替代方案**：删除 `f-tags` 相关代码 → 丢失功能，不可取

### 决策 4：重复投递防护在后端做
- **选择**：`POST /api/pipeline/link` 检查是否已存在 `outcome IS NULL` 的相同 `(candidate_id, job_id)` 关联，若存在返回 400
- **理由**：前端防护可被绕过，数据完整性应在后端保证

## Risks / Trade-offs

- [风险] `onclick` 覆盖方式在极少数场景下可能丢失其他地方绑定的同名事件 → 现有代码全部用 `onclick`，无此问题
- [风险] 时间戳本地化后，历史数据显示时间会变化（早8小时的显示会变正确）→ 这是预期行为，不是 Bug
- [风险] 重复投递防护可能影响"转移岗位"流程（先 withdrawn 再 link）→ 防护只检查 `outcome IS NULL` 的活跃关联，withdrawn 后可重新投递，不受影响

## Migration Plan

1. 修改后端文件（无需数据库迁移）
2. 修改前端 `app.js`
3. 重启服务器（`python3 main.py`）
4. 验证：上传简历→保存候选人、看板淘汰→原因显示、备注弹窗预填、时间显示正确

**回滚**：git revert 即可，无数据库变更风险。

## Open Questions

- 无
