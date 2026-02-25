## 1. 数据模型：新增 type 和 priority 字段

- [x] 1.1 在 `app/models.py` 的 Job 模型新增 `type`（String）和 `priority`（String）字段
- [x] 1.2 在 `app/server.py` 启动时执行 ALTER TABLE 补丁，为已存在的 jobs 表添加 type/priority 列（try/except 兼容）

## 2. 后端：扩展 jobs 接口

- [x] 2.1 在 `job_to_dict` 中新增 `type` 和 `priority` 字段
- [x] 2.2 在 `JobCreate` 和 `JobUpdate` schema 中新增 `type` 和 `priority` 字段
- [x] 2.3 在 `list_jobs` 中新增 `type` 和 `priority` 查询参数筛选

## 3. 前端：岗位表单新增字段

- [x] 3.1 在 `renderJobForm` 中新增「岗位类型」下拉（全职/实习/顾问）
- [x] 3.2 在 `renderJobForm` 中新增「优先级」下拉（高/中/低）
- [x] 3.3 保存时将 type/priority 包含在提交数据中

## 4. 前端：重构 renderJobList 布局

- [x] 4.1 搜索栏独占一行：输入框 + 搜索按钮，支持回车和点击按钮触发
- [x] 4.2 筛选栏独占一行：状态/部门/类型/优先级下拉 + 显示已关闭 checkbox
- [x] 4.3 删除独立编号列，编号合并到职位名称副标题（`@001` 格式）
- [x] 4.4 职位名称第二行副标题改为「城市 · 部门 · 类型」
- [x] 4.5 候选人进展改为 emoji 格式（📄简历 🎯面试 🎁Offer），按阶段顺序映射
- [x] 4.6 删除「最后活动」列
- [x] 4.7 操作列新增「关闭」按钮，点击 confirm 后 PATCH status=closed 并刷新列表
- [x] 4.8 状态列新增优先级标签（高=红、中=橙、低=灰）

## 5. 样式优化

- [x] 5.1 新增优先级标签样式（`.priority-high`、`.priority-mid`、`.priority-low`）
- [x] 5.2 表格行视觉层级优化：职位名称字重加强，副标题颜色区分，行高适当增加
