## Why

活动类型冗余（phone_screen 本质是面试的子集）、Job 表存在假功能字段（stages/interview_rounds 从未被用户自定义且已被活动链自动派生取代）、简历筛选缺少筛选人记录、导入后跳转断裂、弹窗按钮冗余、Next Step 选项过多导致用户决策负担。需要在新增能力之前先做产品简化。

## What Changes

- **BREAKING** 删除 `phone_screen` 活动类型，已有记录保留但不再创建新的
- **BREAKING** 删除 `Job.stages` 字段及前后端所有引用，流程阶段完全由活动链自动体现
- **BREAKING** 删除 `Job.interview_rounds` 和 `CandidateJobLink.interview_rounds` 字段及 PATCH 端点
- 简历筛选（resume_review）通过/淘汰时补全筛选人（actor）字段
- 导入候选人保存后：选了岗位→跳转进行中页并展开对应行；没选岗位→跳转人才库
- 解析弹窗隐藏底部多余"保存候选人"按钮，删除导入表单中"初始阶段"选择器
- 简化 Next Step：每个节点最多2个选项（主操作默认展开 + 备选文字链）

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `activity-chain`: 删除 phone_screen 类型，CHAIN_TYPES 和 STAGE_LABEL 同步更新
- `activity-records`: 删除 phone_screen 相关逻辑，resume_review 补全 actor
- `pipeline-tracking-page`: 删除 phone_screen 表单渲染、简化 Next Step 选项、导入后自动展开、筛选人输入框
- `import-form-ux`: 导入后跳转逻辑修复、删除初始阶段选择器、解析弹窗按钮清理
- `job-api`: 删除 stages/interview_rounds 字段
- `pipeline-stage-ui`: 进度点不再依赖 job_stages，改为纯活动链派生
- `job-detail`: 岗位创建/编辑表单删除 stages 和 interview_rounds 配置区域

## Impact

- 后端：`app/models.py`（删列）、`app/routes/activities.py`（删类型）、`app/routes/jobs.py`（删字段）、`app/routes/pipeline.py`（删端点+清理引用）
- 前端：`static/app.js`（删 phone_screen 表单函数、简化 renderNextStep、修改导入跳转、修改进度点渲染）、`static/index.html`（弹窗按钮清理）
- 数据库：SQLite 不支持 DROP COLUMN（3.35+支持），需确认版本或用重建表方式迁移
- API 破坏性变更：`/api/pipeline/link/{id}/interview-rounds` 端点删除、Job 响应不再包含 stages/interview_rounds
