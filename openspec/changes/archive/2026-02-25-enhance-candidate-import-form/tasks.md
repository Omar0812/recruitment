## 1. 数据库 & 模型

- [x] 1.1 确认 DB 已有 `name_en`、`education_list`、`work_experience` 三列（已 ALTER TABLE）
- [x] 1.2 更新 `app/models.py`：Candidate 新增 `name_en`、`education_list`、`work_experience` 字段

## 2. 后端 API

- [x] 2.1 更新 `CandidateCreate` schema：新增 `name_en`、`education_list`、`work_experience`，`name` 改为可选
- [x] 2.2 更新 `CandidateUpdate` schema：同步新增三个字段
- [x] 2.3 更新 `candidate_to_dict`：输出新三个字段
- [x] 2.4 更新 `create_candidate`：保存时自动同步旧字段（`education_list[0]` → `education`/`school`，`work_experience[0]` → `last_company`/`last_title`）
- [x] 2.5 更新 `update_candidate`：同步旧字段逻辑

## 3. AI Prompt

- [x] 3.1 更新 `app/ai_client.py` 的 `EXTRACT_PROMPT`：改为提取 `name_en`、`education_list`（数组）、`work_experience`（数组），移除 `education`/`school`/`last_company`/`last_title` 单字段

## 4. 前端弹窗 UI

- [x] 4.1 重构 `uploadAndConfirm` 弹窗：基本信息区（姓名/英文名/手机/邮箱/城市/年限/来源/技能标签/备注）
- [x] 4.2 实现教育经历积木块：AI 解析结果渲染为块，支持删除，「+ 添加教育经历」新增空白块
- [x] 4.3 实现工作经历积木块：同上
- [x] 4.4 「关联岗位」改名为「投递岗位」，选项格式改为「岗位名 @编号」
- [x] 4.5 名字校验：`name` 和 `name_en` 至少一个非空，否则提示「姓名不能为空」
- [x] 4.6 保存逻辑：收集积木块数据，构造 `education_list` 和 `work_experience` 数组提交

## 5. 验证

- [x] 5.1 重启服务器，上传一份简历，确认 AI 返回多条经历
- [ ] 5.2 确认积木块正确渲染、可增删
- [ ] 5.3 确认保存后旧字段（`last_company` 等）自动同步
- [ ] 5.4 确认投递岗位选项格式正确
