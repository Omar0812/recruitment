## Why

关闭岗位时，仍在该岗位流程中的候选人状态不会自动处理，容易造成数据遗留；同时已关闭的岗位无法重新打开，需要重新创建，操作繁琐。

## What Changes

- 关闭岗位时弹窗提示还在流程中的候选人数量，HR 可选择批量淘汰或保留
- 已关闭岗位在列表中显示"重新打开"按钮，点击后将状态改回 `open`

## Capabilities

### New Capabilities

- `job-close-with-pipeline-handling`: 关闭岗位时处理在途候选人——弹窗确认 + 批量淘汰选项
- `job-reopen`: 已关闭岗位支持重新打开操作

### Modified Capabilities

- 无

## Impact

- `static/app.js`：`renderJobList()` 关闭按钮逻辑、新增重新打开按钮
- `app/routes/jobs.py`：关闭岗位接口可选批量淘汰在途 links
- `app/routes/pipeline.py`：批量更新 link outcome 接口（或复用现有 outcome 接口）
