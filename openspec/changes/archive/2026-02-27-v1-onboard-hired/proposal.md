## Why

Offer接受后直接标记hired，缺少入职确认环节（入职日期、备注）。已入职候选人散落在人才库中无法集中查看。需要补全 Offer→入职 的最后一公里，并提供已入职人员的独立视图。

## What Changes

- 新增 `onboard` 活动类型，作为 Offer 接受后的下一步（填入职日期+备注），完成后自动标记 outcome=hired
- Offer 接受后不再直接弹 hire 确认弹窗，改为进入 onboard 活动流程
- Offer 拒绝后自动标记 outcome=rejected
- 新增"已入职"导航页面，展示所有 outcome=hired 的候选人（姓名、岗位、入职日期、入职天数）
- 人才库中已入职人员显示标签，不可再推荐到岗位

## Capabilities

### New Capabilities
- `onboard-activity`: onboard 活动类型定义、表单渲染、流程衔接（Offer接受→onboard→hired）
- `hired-page`: 已入职候选人列表页面（导航项、数据展示、搜索筛选）

### Modified Capabilities
- `pipeline-tracking-page`: Offer 接受后 Next Step 改为"确认入职"（创建 onboard 活动），不再直接弹 hire 弹窗
- `generic-modal`: hire-overlay 删除，onboard 表单通过 openDialog 渲染

## Impact

- 后端：`app/routes/activities.py` CHAIN_TYPES/STAGE_LABEL 新增 onboard；offer 拒绝自动 reject
- 后端：新增 `/api/pipeline/hired` 端点
- 前端：`static/app.js` 新增 renderOnboardFormHTML、已入职页面渲染、导航项
- 前端：`static/index.html` 新增导航项
- 前端：`static/style.css` 已入职页面样式
