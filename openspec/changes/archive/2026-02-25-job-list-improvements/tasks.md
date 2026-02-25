## 1. 后端：扩展 /api/jobs 接口

- [x] 1.1 在 `jobs.py` 的 `list_jobs` 中添加 `q` 查询参数，按职位名称/部门/HR字段模糊匹配
- [x] 1.2 在 `list_jobs` 中添加 `department` 查询参数，精确匹配部门字段
- [x] 1.3 在 `list_jobs` 返回的每条岗位数据中内嵌 `stage_counts`（dict，key 为阶段名，value 为活跃候选人数）

## 2. 样式修复

- [x] 2.1 在 `style.css` 中为 `.btn` 添加 `text-decoration: none`，修复 `<a>` 标签下划线

## 3. 前端：filter bar

- [x] 3.1 重写 `renderJobList` 的 HTML 结构，改为两行布局（标题行 + filter bar 行）
- [x] 3.2 filter bar 包含：搜索框、状态下拉（全部/招聘中/暂停/已关闭）、部门下拉（动态）、显示已关闭 checkbox
- [x] 3.3 搜索框 debounce 300ms 触发重新请求
- [x] 3.4 状态/部门下拉 onChange 触发重新请求
- [x] 3.5 部门下拉选项从接口返回数据中动态提取唯一值

## 4. 前端：表格列改造

- [x] 4.1 表格新增 `#` 编号列，显示岗位 ID（零填充3位，如 `#001`）
- [x] 4.2 职位名称单元格改为两行：名称 + 副标题（部门 · 城市 · 创建时间，缺失字段跳过）
- [x] 4.3 候选人数列改为阶段分布 badge，使用 `stage_counts` 数据渲染，无活跃候选人显示 `-`
