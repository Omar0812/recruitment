## 1. 前端 api.delete 修复

- [x] 1.1 修改 `static/app.js` 第15行 `api.delete` 方法，支持可选的 body 参数（与 `lib/api.js` 保持一致）

## 2. activity_records 双写 payload 同步

- [x] 2.1 修改 `app/routes/activities.py` `update_activity` 函数：在 `setattr` 更新稀疏列之后，检查 record.payload 是否存在，若存在则将被更新的字段同步到 payload 对应 key
- [x] 2.2 修改 `app/routes/activities.py` `create_activity` 函数：`onboard` 类型跳过链尾约束检查（在约束判断块前加 `if data.type == "onboard": pass` 跳过）

## 3. 候选人合并 activity_records 迁移

- [x] 3.1 修改 `app/routes/dedup.py` `merge_candidates` 函数：将 `sec_link.interview_records` 改为 `sec_link.activity_records`，迁移 activity_records 的 link_id 到主档案对应 link
- [x] 3.2 从 `app/routes/dedup.py` import 中移除 `InterviewRecord`

## 4. InterviewRecord 模型清理

- [x] 4.1 从 `app/models.py` 删除 `InterviewRecord` 类定义
- [x] 4.2 从 `app/models.py` `CandidateJobLink` 中删除 `interview_records = relationship(...)` 这行
- [x] 4.3 删除 `app/routes/interviews.py` 文件（未挂载路由，依赖废弃模型）
- [x] 4.4 确認 `app/server.py` 的 import 列表中不再引用 `interviews` router

## 5. Candidate name 校验

- [x] 5.1 在 `app/routes/candidates.py` `create_candidate` 函数开头加校验：若 name 和 name_en 均为空，raise HTTPException(400, "姓名不能为空")

## 6. insights P2 逻辑修正

- [x] 6.1 修改 `app/routes/insights.py` P2 unassigned 逻辑：将判断条件从"没有 outcome=null 的 link"改为"job_links 列表为空"（即从未分配过任何岗位）

## 7. job-api N+1 修复

- [x] 7.1 修改 `app/routes/jobs.py` `list_jobs` 函数：在 query 上加 `options(joinedload(Job.candidate_links).joinedload(CandidateJobLink.candidate))`，并在 import 中加 `joinedload`

## 8. 验证

- [x] 8.1 启动服务，验证解除黑名单功能正常（api.delete 传 body）
- [x] 8.2 验证更新面试活动 conclusion 后，再次读取返回正确值（不被旧 payload 覆盖）
- [x] 8.3 验证 onboard 活动可在 offer 未填 conclusion 时创建成功
- [x] 8.4 验证 GET /api/insights/today 的 P2 列表不包含已入职/已退出候选人
- [x] 8.5 验证服务启动后数据库中不出现新建的 interview_records 空表
