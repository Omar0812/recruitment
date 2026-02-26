## Why

v1全面重构的第一批：修复4个已确认的Bug和漏洞。这些问题会导致用户在关键操作路径上卡死或看到异常状态，必须在后续产品简化之前先修复。

## What Changes

- **Offer接受后取消hire弹窗导致卡死**：offer.conclusion="接受"保存后用户取消hire弹窗，outcome仍为null，renderNextStep对offer类型没有下一步选项，用户彻底无法操作。修复为检测到offer已接受但未入职时显示"确认入职"按钮。
- **转移岗位后页面不刷新**：transfer成功后调用renderContent()，但links数组是页面初始化时fetch的旧数据，新link不在数组中。修复为transfer后重新fetch `/api/pipeline/active` 更新links数组。
- **活动表单空值保存异常显示**：phone_screen/offer等表单conclusion为空字符串时后端接受，前端渲染出空白状态tag。修复为保存前校验conclusion不能为空。
- **清理InterviewRecord废弃引用**：pipeline.py的transfer函数仍引用已废弃的InterviewRecord表，可能导致运行时错误。删除该引用。

## Capabilities

### New Capabilities

_(无新增能力)_

### Modified Capabilities
- `stage-advance-flow`: Offer接受后的下一步逻辑变更，增加对"已接受但未入职"状态的处理
- `pipeline-tracking-page`: 转移岗位后重新fetch数据刷新页面
- `activity-records`: 活动表单保存前增加conclusion非空校验
- `candidate-job-transfer`: 删除transfer中的InterviewRecord废弃引用

## Impact

- `static/app.js` — renderNextStep逻辑、transfer回调、表单保存校验
- `app/routes/pipeline.py` — transfer函数清理InterviewRecord引用
