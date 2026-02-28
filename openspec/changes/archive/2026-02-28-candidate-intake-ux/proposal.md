## Why

候选人创建流程存在严重的功能断裂：简历上传后 AI 解析结果被丢弃，候选人从未真正入库，系统却提示"已创建成功"；同时缺少手动建档入口，无法跟踪尚未提供简历的高阶人选；今日待办页作为主页却没有任何快捷创建入口，用户需要跨多个页面才能完成建档操作。

## What Changes

- **修复 BUG**：简历上传后不再直接 toast 成功，而是弹出确认弹窗让用户审核 AI 解析结果后再真正创建候选人
- **新增**：统一的「新建候选人」弹窗组件，支持上传简历（AI预填）和手动填写两种模式，手动填写区默认折叠
- **新增**：Today 页 header 加「新建候选人」快捷按钮
- **修改**：Talent 页「导入简历」按钮替换为「新建候选人」，复用同一弹窗组件
- 后端无需改动

## Capabilities

### New Capabilities
- `candidate-create-dialog`: 统一的候选人创建弹窗，支持上传简历+AI预填 和 手动填写 两种路径，合并为一个入口和一个确认步骤

### Modified Capabilities
- `import-form-ux`: 原有简历上传弹窗逻辑重构，上传后必须经过确认弹窗才能入库
- `vue3-today-page`: 今日待办页 header 新增「新建候选人」快捷入口
- `vue3-talent-page`: 「导入简历」按钮替换为「新建候选人」，引用新组件

## Impact

- `frontend/src/components/CreateCandidateDialog.vue`（新建）
- `frontend/src/pages/Today.vue`（加按钮 + 引入组件）
- `frontend/src/pages/Talent.vue`（替换原上传逻辑）
- `app/routes/resume.py` 不改（`/api/resume/upload` 返回 parsed 已够用）
- `app/routes/candidates.py` 不改（`POST /api/candidates` 支持无 resume_path）
