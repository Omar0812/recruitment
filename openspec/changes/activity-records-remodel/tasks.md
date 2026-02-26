## 1. DB 迁移：新建 activity_records 表

- [ ] 1.1 `app/models.py`：新增 `ActivityRecord` 模型，字段包含 id/link_id/type/stage/created_at/actor/comment/conclusion/rejection_reason/round/interview_time/scheduled_at/location/status/score/salary/start_date/from_stage/to_stage
- [ ] 1.2 `app/server.py`：启动时执行 CREATE TABLE activity_records（如不存在）
- [ ] 1.3 `app/server.py`：启动时执行迁移脚本：INSERT INTO activity_records SELECT from interview_records（type='interview'，stage 从对应 link.stage 取）
- [ ] 1.4 `app/server.py`：迁移后 RENAME interview_records TO interview_records_bak（保留备份）

## 2. 后端：activities 路由

- [ ] 2.1 新建 `app/routes/activities.py`，实现 GET `/api/activities?link_id={id}`（按 created_at 升序）
- [ ] 2.2 实现 POST `/api/activities`，支持所有 type，stage 字段必传，写入时同时检查 link 存在
- [ ] 2.3 实现 PATCH `/api/activities/{id}`，stage 和 type 字段不可修改
- [ ] 2.4 实现 DELETE `/api/activities/{id}`
- [ ] 2.5 `app/server.py`：注册 activities router，移除 interviews router

## 3. 后端：stage 推进写入 stage_change activity

- [ ] 3.1 `app/routes/pipeline.py`：`update_stage` 接口在同一事务中写入 type=`stage_change` 的 ActivityRecord（from_stage/to_stage/stage=新阶段）

## 4. 前端：原因选项扩充

- [ ] 4.1 `static/index.html`：`#interview-overlay` 淘汰原因按钮扩充为9个选项（三维度）
- [ ] 4.2 `static/index.html`：`#withdraw-overlay` 改为必选原因（6个选项按钮组）+ 选填补充说明文本框
- [ ] 4.3 `static/app.js`：`renderIvFormHTML` 淘汰原因按钮同步扩充为9个选项
- [ ] 4.4 `static/app.js`：`openWithdrawOverlay` 确认前校验必须选择原因，未选则 showToast 提示

## 5. 前端：面试时间选择器重构

- [ ] 5.1 `static/app.js`：新增 `renderTimeSlotHTML()` 函数，生成日期 input + 时间段 select（08:00~22:00，15分钟步进）
- [ ] 5.2 `static/app.js`：`renderScheduleFormHTML` 使用新时间选择器替换 datetime-local input
- [ ] 5.3 `static/index.html`：`#interview-overlay` 面试时间字段替换为日期+时间段下拉
- [ ] 5.4 `static/app.js`：`openInterviewOverlay` / `initInterviewOverlay` 适配新时间字段读写

## 6. 前端：activity timeline 渲染

- [ ] 6.1 `static/app.js`：新增 `renderActivityCard(activity)` 函数，按 type 差异化渲染（interview/phone_screen/note/offer/stage_change）
- [ ] 6.2 `static/app.js`：新增 `renderActivityTimeline(activities, currentStage)` 函数，按 stage 分组，stage_change 作为分组间过渡标记
- [ ] 6.3 `static/app.js`：`renderExpandInner` 重构，使用 `renderActivityTimeline`，当前阶段组显示"+ 添加"按钮，历史阶段组只读
- [ ] 6.4 `static/app.js`：API 调用从 `/api/interviews` 切换到 `/api/activities`

## 7. 前端：推进阶段合并活动创建入口

- [ ] 7.1 `static/app.js`：stage dropdown `onchange` 推进后根据阶段名称智能判断活动类型，展示对应表单
- [ ] 7.2 `static/app.js`：表单提供"跳过"按钮，跳过时不创建 activity 记录

## 8. 前端：候选人详情流程 tab 适配

- [ ] 8.1 `static/app.js`：`renderPipelineTab` 使用 `/api/activities` 数据，调用 `renderActivityTimeline` 只读渲染
- [ ] 8.2 `static/app.js`：`renderProgressDots` 适配 activity_records（过滤 stage_change 类型，只计 interview/phone_screen/offer 等）

## 9. 前端：活动类型表单

- [ ] 9.1 `static/app.js`：新增 `renderPhoneScreenFormHTML()` 和对应 bind/get 函数
- [ ] 9.2 `static/app.js`：新增 `renderNoteFormHTML()` 和对应 bind/get 函数
- [ ] 9.3 `static/app.js`：新增 `renderOfferFormHTML()` 和对应 bind/get 函数（salary/start_date/conclusion）
- [ ] 9.4 `static/app.js`：`renderIvFormHTML` / `renderScheduleFormHTML` 适配新 API 字段（link_id 改传 stage）
