## Why

岗位库列表缺乏搜索和筛选能力，当岗位数量增多时 HR 无法快速定位目标岗位；同名岗位无法区分；候选人进展信息过于简单，无法一眼判断招聘健康度。

## What Changes

- 新增 filter bar（两行布局）：第一行标题+新建按钮，第二行搜索框+状态下拉+部门下拉+显示已关闭 checkbox
- 表格新增 `#` 编号列，显示岗位自增 ID
- 职位名称单元格新增副标题行，显示「部门 · 城市 · 创建时间」
- 候选人数列改为阶段分布 badge，仅显示有候选人的阶段（如 `● 筛选2 ● 面试3`）
- 修复「+ 新建岗位」`<a>` 标签下划线样式 bug
- 部门下拉选项从现有岗位数据动态提取

## Capabilities

### New Capabilities
- `job-list-filter`: 岗位库搜索与筛选，包括关键词搜索、状态筛选、部门筛选
- `job-list-display`: 岗位列表展示增强，包括编号列、副标题、阶段分布 badge

### Modified Capabilities

## Impact

- `static/app.js`: `renderJobList` 函数重写，新增 filter bar 渲染和事件绑定
- `static/style.css`: 新增 filter bar 样式，修复 `.btn` 在 `<a>` 标签上的下划线
- `app/routes/jobs.py`: `list_jobs` 接口需支持 `q`（关键词）和 `department`（部门）查询参数；返回数据需包含各阶段候选人分布
- `app/routes/dashboard.py` 或 `pipeline.py`: 可能需要聚合阶段分布数据
