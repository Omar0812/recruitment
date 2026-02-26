## 1. 后端：删除 phone_screen 活动类型

- [x] 1.1 `app/routes/activities.py`: CHAIN_TYPES 删除 `phone_screen`（保留 STAGE_LABEL 映射用于历史数据展示）
- [x] 1.2 `app/routes/activities.py`: 创建活动时如果 type=phone_screen 返回 400
- [x] 1.3 `app/routes/activities.py`: stage 自动派生逻辑中保留 phone_screen→"电话初筛" 映射（历史兼容）

## 2. 后端：删除 Job.stages 和 interview_rounds

- [x] 2.1 `app/models.py`: Job 表删除 `stages` 列、`interview_rounds` 列
- [x] 2.2 `app/models.py`: CandidateJobLink 表删除 `interview_rounds` 列
- [x] 2.3 `app/routes/jobs.py`: JobCreate/JobUpdate 删除 stages 和 interview_rounds 字段，job_to_dict 不再返回这两个字段，删除 DEFAULT_STAGES
- [x] 2.4 `app/routes/pipeline.py`: link_to_dict 删除 job_stages 和 interview_rounds 返回，删除 `update_interview_rounds` 端点
- [x] 2.5 `main.py`: 添加启动迁移脚本，用 ALTER TABLE DROP COLUMN 删除三个列（try/except 兜底）

## 3. 前端：删除 phone_screen 相关代码

- [x] 3.1 `static/app.js`: CHAIN_TYPES Set 删除 phone_screen（保留类型标签映射用于历史展示）
- [x] 3.2 `static/app.js`: 删除 renderPhoneScreenFormHTML、getPhoneScreenFormData、bindPhoneScreenFormInteractivity 函数
- [x] 3.3 `static/app.js`: renderNextStep 中删除 phone_screen 选项，renderExpandInner 中删除 phone_screen 表单渲染分支

## 4. 前端：删除 stages/interview_rounds 相关代码

- [x] 4.1 `static/app.js`: 删除导入表单中选择岗位后动态加载 stages 的逻辑（约 line 464-475）
- [x] 4.2 `static/app.js`: renderProgressDots / renderProgress 改为从活动链派生，删除对 job_stages 的依赖
- [x] 4.3 `static/app.js`: 岗位创建/编辑表单删除 stages textarea 和 interview_rounds 输入框
- [x] 4.4 `static/index.html`: 删除 f-stage-block（初始阶段选择器）DOM 元素

## 5. 前端：简历筛选补全筛选人

- [x] 5.1 `static/app.js`: resume_review pending 节点渲染时，在通过/淘汰按钮上方添加"筛选人"文本输入框
- [x] 5.2 `static/app.js`: 通过/淘汰提交时读取 actor 值，为空则 toast "请填写筛选人" 并阻止提交

## 6. 前端：导入后跳转修复

- [x] 6.1 `static/app.js`: uploadAndConfirm 保存成功后，选了岗位→ `location.hash='#/pipeline?expand={linkId}'`，没选→ `location.hash='#/talent'` + toast "已入库"
- [x] 6.2 `static/app.js`: 进行中页 renderPipelineTracking 初始化时解析 URL expand 参数，自动展开并滚动到对应行

## 7. 前端：弹窗清理

- [x] 7.1 `static/app.js`: 解析模式下隐藏 modal-save 按钮（底部多余的"保存候选人"）
- [x] 7.2 `static/index.html` + `static/app.js`: 删除 f-stage-block 相关 DOM 和 JS 逻辑

## 8. 前端：Next Step 简化

- [x] 8.1 `static/app.js`: renderNextStep 重写 — resume_review 通过后：主操作"安排面试"默认展开 + 备选文字链"直接发Offer"
- [x] 8.2 `static/app.js`: renderNextStep — interview 通过后：主操作"安排下一轮"默认展开 + 备选文字链"发Offer"
- [x] 8.3 `static/app.js`: renderNextStep — offer 接受后：唯一操作"确认入职"按钮
- [x] 8.4 `static/app.js`: 点击备选文字链时切换当前展开的表单

## 9. 候选人详情页适配

- [x] 9.1 `static/app.js`: 候选人详情流程 tab 时间轴改为从活动链派生，删除对 job_stages 的依赖
