## 1. Offer接受后卡死修复

- [x] 1.1 在 `static/app.js` 的 `renderNextStep` 函数中，增加对 offer.conclusion="接受" 且 link.outcome=null 的特判：显示"确认入职"按钮，点击触发 `openHireOverlay`
- [x] 1.2 验证：Offer接受 → 取消hire弹窗 → 重新展开行 → "确认入职"按钮仍可见且可用

## 2. 转移岗位后页面刷新修复

- [x] 2.1 在 `static/app.js` 的 transfer 按钮 onclick 回调中，transfer成功后重新 `api.get('/api/pipeline/active')` 获取最新数据
- [x] 2.2 用返回值替换闭包中 links 数组内容（`links.length = 0; links.push(...freshLinks)`），再调用 `renderContent()`
- [x] 2.3 验证：转移岗位后页面立即显示新岗位下的候选人，旧岗位下该候选人消失

## 3. 活动表单空conclusion校验

- [x] 3.1 在 `static/app.js` 的 phone_screen 表单 save 逻辑中，检查 conclusion 为空时 showToast("请选择结论", "error") 并 return
- [x] 3.2 在 offer 表单 save 逻辑中，同样增加 conclusion 非空校验
- [x] 3.3 在 interview inline form（ivf-save）的 save 逻辑中，同样增加 conclusion 非空校验
- [x] 3.4 验证：不选结论直接点保存 → 显示提示，不提交请求

## 4. 清理InterviewRecord废弃引用

- [x] 4.1 在 `app/routes/pipeline.py` 的 `transfer_job` 函数中，删除第205-208行的 `db.query(InterviewRecord).filter(...).update(...)` 代码
- [x] 4.2 检查 pipeline.py 顶部 import，如果 InterviewRecord 不再被其他地方引用则从 import 中移除
- [x] 4.3 验证：转移岗位 API 调用正常，无 InterviewRecord 相关错误
