## Why

导入简历时没有重复检测，同一个候选人可能被多次创建为不同档案，导致数据冗余和跟进混乱。需要在确认弹窗阶段检测重复，让 HR 决定是更新已有档案还是新建。

## What Changes

- 后端新增 `POST /api/candidates/check-duplicate` 接口，接收 name/phone/email/last_company，返回匹配的已有候选人列表
- 前端简历确认弹窗中，解析完成后调用查重接口
- 若发现重复，在弹窗顶部显示警告，提供"更新已有档案"和"仍然新建"两个操作
- "更新已有档案"：将解析信息 PATCH 到已有候选人，并可选更新 resume_path

## Capabilities

### New Capabilities
- `resume-dedup`: 简历导入时的重复候选人检测与处理流程

### Modified Capabilities

## Impact

- `app/routes/candidates.py`：新增 `check-duplicate` 端点
- `static/app.js`：`uploadAndConfirm` 函数新增查重逻辑和 UI 提示
