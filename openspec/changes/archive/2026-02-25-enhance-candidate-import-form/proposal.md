## Why

导入简历后的「确认候选人信息」弹窗只能保存单条教育/工作经历，且缺少英文名字段，导致候选人档案信息不完整。积木式新增体验比预设空白表单更自然，符合简历信息的实际结构。

## What Changes

- 新增 `name_en`（英文名）字段，姓名与英文名至少填一个即可保存
- 教育经历从单字段（`education` + `school`）升级为可多条的积木块（`education_list` JSON数组），每条含学历/院校/专业/时间段
- 工作经历从单字段（`last_company` + `last_title`）升级为可多条的积木块（`work_experience` JSON数组），每条含公司/职位/时间段
- 弹窗 UI 重构：基本信息区固定表单 + 教育/工作经历区积木式新增，AI 解析结果直接渲染为积木块
- 「关联岗位」改名为「投递岗位」，选项显示格式改为「岗位名 @编号」
- AI prompt 更新，提取全量教育和工作经历数组
- 原有 `education/school/last_company/last_title` 字段保留，自动同步为新数组第一条（向后兼容）

## Capabilities

### New Capabilities
- `candidate-rich-profile`: 候选人档案支持多条教育经历和工作经历，以及英文名字段
- `import-form-ux`: 导入弹窗积木式 UI，AI 解析结果直接渲染为可编辑积木块，投递岗位选项格式统一

### Modified Capabilities

（无现有 spec 文件，无需 delta spec）

## Impact

- `app/models.py`: Candidate 模型新增 `name_en`、`education_list`、`work_experience` 三列
- `app/routes/candidates.py`: CandidateCreate/Update schema 新增字段，`candidate_to_dict` 同步输出
- `app/ai_client.py`: `EXTRACT_PROMPT` 改为提取数组格式
- `static/app.js`: `uploadAndConfirm` 弹窗 UI 重构，`modal-save` 保存逻辑更新
- SQLite DB: ALTER TABLE 补加三列（`name_en`, `education_list`, `work_experience`）
