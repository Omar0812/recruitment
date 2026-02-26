## REMOVED Requirements

### Requirement: hire-overlay 弹窗
**Reason**: 入职确认改为 onboard 活动表单流程，不再需要独立的 hire 确认弹窗。
**Migration**: 所有入职确认通过 onboard 活动表单完成，使用 openDialog 渲染。openHireOverlay 函数删除。
