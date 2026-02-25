## 1. 后端

- [x] 1.1 修改 `app/routes/candidates.py` 的 `list_candidates`，在每个候选人 dict 中新增 `active_links` 字段（过滤 outcome 为空的 job_links，返回 job_id、job_title、stage）

## 2. 前端

- [x] 2.1 在 `renderTalentPool` 表头新增"当前岗位·阶段"列
- [x] 2.2 在每行渲染 `active_links`，格式"岗位名 · 阶段"，多个用换行分隔，无则显示"-"
- [x] 2.3 删除原"关联岗位"列（显示岗位数量的那列，已被新列替代）

## 3. 验证

- [x] 3.1 有活跃流程的候选人正确显示岗位和阶段
- [x] 3.2 无活跃流程的候选人显示"-"
- [x] 3.3 已淘汰/退出的关联不出现在该列
