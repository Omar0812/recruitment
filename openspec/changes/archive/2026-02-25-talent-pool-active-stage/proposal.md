## Why

人才库列表目前只显示候选人基本信息，无法直接看出某人当前在哪个岗位的哪个阶段，HR 需要点进详情页才能了解进展，效率低。

## What Changes

- 后端 `/api/candidates` 列表接口新增 `active_links` 字段，返回每个候选人当前活跃的岗位+阶段（排除 outcome 不为空的记录）
- 前端人才库表格新增"当前岗位·阶段"列，展示 active_links 内容

## Capabilities

### New Capabilities

### Modified Capabilities
- `talent-pool-view`: 人才库列表新增"当前岗位·阶段"列，显示候选人活跃流程进展

## Impact

- `app/routes/candidates.py`：`list_candidates` 返回值新增 `active_links`
- `static/app.js`：`renderTalentPool` 表格新增列
