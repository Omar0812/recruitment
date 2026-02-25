## 1. 数据库迁移

- [x] 1.1 ALTER TABLE candidate_job_links ADD COLUMN rejection_reason VARCHAR
- [x] 1.2 创建 interview_records 表（id, link_id, round, interviewer, interview_time, score, comment, conclusion, created_at）

## 2. 后端模型与 API

- [x] 2.1 在 app/models.py 新增 InterviewRecord 模型，关联 CandidateJobLink
- [x] 2.2 在 app/models.py 的 CandidateJobLink 新增 rejection_reason 字段
- [x] 2.3 新增 app/routes/interviews.py，实现 POST /api/interviews、GET /api/interviews?link_id=、DELETE /api/interviews/{id}
- [x] 2.4 更新 app/routes/pipeline.py 的淘汰接口，支持接收并保存 rejection_reason
- [x] 2.5 在 main.py 注册 interviews router

## 3. 前端：面试记录

- [x] 3.1 看板卡片新增展开/收起按钮，展开后显示面试记录区域
- [x] 3.2 面试记录区域展示记录列表（轮次、面试官、时间、评分、结论）
- [x] 3.3 新增面试记录弹窗（复用 overlay 模式），包含轮次、面试官、时间、评分、评语、结论字段
- [x] 3.4 实现删除面试记录功能（带确认）

## 4. 前端：淘汰原因

- [x] 4.1 淘汰操作改为弹窗，包含原因下拉（能力不足/薪资不匹配/主动放弃/其他）
- [x] 4.2 已淘汰卡片展示 rejection_reason 标签
