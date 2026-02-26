## 1. 后端：onboard 活动类型

- [x] 1.1 activities.py CHAIN_TYPES 新增 "onboard"，STAGE_LABEL 新增 "onboard" → "入职确认"
- [x] 1.2 activities.py create 端点：type="onboard" 时自动设置 conclusion="已入职"、status="completed"，并自动 PATCH link outcome=hired
- [x] 1.3 Offer 表单保存：conclusion="拒绝" 时前端自动调用 outcome 接口标记 rejected

## 2. 后端：已入职 API

- [x] 2.1 pipeline.py 新增 GET /api/pipeline/hired 端点，返回 outcome=hired 的 link 列表（含 candidate_name、job_title、start_date、source）

## 3. 前端：onboard 表单

- [x] 3.1 新增 renderOnboardFormHTML() 函数（入职日期 date input + 备注 textarea + 确认/取消按钮）
- [x] 3.2 新增 getOnboardFormData() 函数
- [x] 3.3 renderNextStep 中 offer 接受后：替换"确认入职"按钮为 onboard 表单内联渲染
- [x] 3.4 onboard 表单保存：创建 onboard 活动 → 从进行中列表移除 → 显示成功提示

## 4. 前端：Offer 拒绝处理

- [x] 4.1 offer 表单保存：conclusion="拒绝" 时自动调用 PATCH outcome=rejected，从列表移除

## 5. 前端：删除 hire-overlay

- [x] 5.1 删除 openHireOverlay 函数
- [x] 5.2 删除所有 openHireOverlay 调用点（renderNextStep、offer 表单保存中）

## 6. 前端：已入职页面

- [x] 6.1 index.html 导航栏新增"已入职"链接（href="#/hired"）
- [x] 6.2 app.js router() 新增 #/hired 路由，调用 renderHiredPage
- [x] 6.3 新增 renderHiredPage(el) 函数：搜索框 + 表格（姓名链接、岗位、入职日期、入职天数、来源）+ 空状态

## 7. 前端：人才库已入职限制

- [x] 7.1 人才库列表：已入职候选人显示"已入职"标签，隐藏推荐按钮

## 8. 活动卡片渲染

- [x] 8.1 renderActivityCard 支持 type="onboard" 的只读卡片渲染（显示入职日期+备注）
- [x] 8.2 renderIvCard（进度条 tooltip）支持 onboard 类型显示
