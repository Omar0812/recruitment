## 1. 后端 & 数据模型

- [x] 1.1 更新 `app/models.py`：Candidate.years_exp 改为 Float
- [x] 1.2 更新 `app/routes/candidates.py`：CandidateCreate/Update years_exp 改为 Optional[float]
- [x] 1.3 更新 `app/ai_client.py`：EXTRACT_PROMPT 工作年限改为精确到 0.5 年

## 2. 候选人编号

- [x] 2.1 更新 `candidate_to_dict`：新增 `display_id` 字段（`C{id:03d}`）
- [x] 2.2 更新 `candidate_to_dict`：新增 `display_name` 字段（`{name} @C{id:03d}`）

## 3. 详情页 Header 重构

- [x] 3.1 去掉头像，标题改为「{name} @C{id:03d}」，副标题显示英文名（若有）
- [x] 3.2 Header 展示最近工作经历（work_experience[0]）、最高学历（education_list[0]）
- [x] 3.3 Header 展示联系方式（手机·邮箱）、工作年限（float格式）
- [x] 3.4 Header 展示最近一条进行中流程（无则显示「暂无」）
- [x] 3.5 Header 保留跟进状态下拉

## 4. 三 Tab 结构

- [x] 4.1 实现 tab 切换逻辑（简历背景/投递记录/历史记录，默认简历背景）
- [x] 4.2 简历背景 tab：工作经历列表 + 教育经历列表
- [x] 4.3 投递记录 tab：展示所有 job_links，进行中显示操作按钮（推进阶段/转移岗位/淘汰）
- [x] 4.4 历史记录 tab：时间线展示，每条带岗位名称（通过 job_id 关联）

## 5. 转移岗位

- [x] 5.1 投递记录 tab「转移岗位」按钮：弹窗选目标岗位+初始阶段
- [x] 5.2 确认后：PATCH 原 job_link outcome=withdrawn，POST 新 job_link
- [x] 5.3 转移后刷新详情页

## 6. 流程跟进快捷淘汰

- [x] 6.1 流程跟进表格每行加「淘汰」按钮
- [x] 6.2 点击弹出淘汰原因弹窗（复用 #reject-overlay），确认后标记 rejected
- [x] 6.3 淘汰后询问是否补填面评（复用 #interview-overlay），可跳过
- [x] 6.4 淘汰后该行从流程跟进列表移除

## 7. 验证

- [ ] 7.1 重启服务器，确认编号展示正确
- [ ] 7.2 确认 tab 切换正常，默认简历背景
- [ ] 7.3 确认转移岗位流程正常
- [ ] 7.4 确认流程跟进快捷淘汰正常
- [ ] 7.5 确认工作年限支持 0.5 精度
