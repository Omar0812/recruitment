## 1. 候选人详情 header 修复

- [x] 1.1 修改 renderCandidateProfile：当无活跃流程时，从 job_links 中找最近一条有 outcome 的记录，展示"最近流程：[岗位名] · 淘汰（[原因]）"或"已退出"

## 2. 投递记录 tab 展开面试记录

- [x] 2.1 在"投递记录" tab 每行末尾添加展开/收起按钮（▶/▼）
- [x] 2.2 点击展开时调用 GET /api/interviews?link_id=xxx，在该行下方插入面试记录子表格（轮次/面试官/时间/评分/评语/结论）
- [x] 2.3 实现懒加载缓存：首次加载后缓存数据，重复展开不重复请求
- [x] 2.4 无面试记录时显示"暂无面试记录"

## 3. 看板卡片只读化

- [x] 3.1 修改 renderCard：根据 lnk.outcome 判断 active/inactive 状态
- [x] 3.2 inactive 卡片：灰化样式（opacity + 背景色），不渲染移阶段 select、备注按钮、淘汰按钮
- [x] 3.3 inactive 卡片：保留候选人姓名链接和淘汰原因 tag

## 4. 看板列折叠已淘汰卡片

- [x] 4.1 修改 renderPipeline 的列渲染：将 active 和 inactive 卡片分开，inactive 默认用 hidden class 包裹
- [x] 4.2 在每列底部添加"显示已淘汰 (N)"toggle 按钮，N > 0 时才渲染
- [x] 4.3 绑定 toggle 点击事件：切换 inactive 卡片组的显示/隐藏，更新按钮文字
