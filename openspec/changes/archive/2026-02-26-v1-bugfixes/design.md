## Context

招聘管理工具 v0.5 已实现活动链驱动的流程推进，但在实际使用中发现4个Bug：
1. Offer接受后取消hire弹窗导致用户卡死（无法继续操作）
2. 转移岗位后links数组未刷新，页面显示旧数据
3. 活动表单（phone_screen/offer）空conclusion保存后渲染异常
4. pipeline.py transfer函数仍引用已废弃的InterviewRecord

这些都是边界情况处理不完整导致的，修复方案明确，不涉及架构变更。

## Goals / Non-Goals

**Goals:**
- 修复4个已确认Bug，确保所有操作路径无卡死、无异常显示
- 清理废弃代码引用，消除潜在运行时错误

**Non-Goals:**
- 不做产品简化（删phone_screen、删stages等属于v1-product-simplify）
- 不做UI/交互优化
- 不做前端模块化拆分

## Decisions

### 1. Offer接受后卡死：在renderNextStep中增加offer已接受的分支

当前renderNextStep只在`tail.conclusion === "通过" || tail.conclusion === "接受"`时显示下一步，但offer类型没有对应的options，导致空数组。

方案：在renderNextStep开头增加特判——如果tail是offer且conclusion="接受"，直接显示"确认入职"按钮（复用openHireOverlay）。不需要改后端。

替代方案考虑：在offer保存时强制弹hire弹窗且不可取消——过于强硬，用户可能需要先确认其他信息再入职。

### 2. 转移岗位后刷新：transfer回调中重新fetch

当前transfer成功后直接调用renderContent()，但links是闭包中的数组引用。

方案：transfer成功后调用`api.get('/api/pipeline/active')`，用返回值替换links数组内容（splice+push保持引用），再renderContent。

替代方案考虑：整页reload——太粗暴，会丢失搜索状态和分组模式。

### 3. 空conclusion校验：前端保存前拦截

当前phone_screen和offer表单的save逻辑不校验conclusion。

方案：在ivf-save的onclick中，检查conclusion为空字符串或null时，showToast提示"请选择结论"并return。同时对interview表单（inline form）也做同样校验。

替代方案考虑：后端校验——可以做但不够，因为有些场景（如offer谈判中）conclusion确实可以为空，需要区分"用户主动选了空"和"用户忘了选"。前端校验更精准。

### 4. 清理InterviewRecord引用：直接删除

pipeline.py transfer函数第205-208行引用InterviewRecord做记录迁移，但InterviewRecord已废弃（数据在interview_records_bak）。

方案：删除这4行代码。transfer的keep_records逻辑本身也已无意义（ActivityRecord不需要迁移，新link会从头开始），但保留参数兼容性，只是不执行任何操作。

## Risks / Trade-offs

- [Risk] 修改renderNextStep可能影响其他conclusion值的分支 → Mitigation: 只在options为空且tail.type=offer且conclusion=接受时触发，不影响其他路径
- [Risk] 重新fetch links可能有短暂闪烁 → Mitigation: 可接受，数据一致性优先
- [Risk] 前端conclusion校验可能阻止合法的"暂存"操作 → Mitigation: 当前产品设计不支持暂存，所有保存都是终态提交
