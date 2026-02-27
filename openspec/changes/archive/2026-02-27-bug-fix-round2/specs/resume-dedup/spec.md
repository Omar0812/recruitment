## MODIFIED Requirements

### Requirement: 合并候选人迁移 activity_records 而非 interview_records
`POST /api/candidates/dedup/merge` 在合并同一岗位的两条 link 时，SHALL 将副档案 link 下的 `activity_records` 迁移到主档案对应的 link，而非迁移废弃的 `interview_records`。`InterviewRecord` 模型已废弃，不再参与 merge 逻辑。

#### Scenario: 合并同岗位候选人保留活动记录
- **WHEN** 主档案和副档案都有同一岗位（job_id 相同）的 link，且副档案 link 下有 activity_records
- **THEN** 副档案的 activity_records 迁移到主档案对应 link（link_id 更新），副档案 link 被删除

#### Scenario: 合并不同岗位候选人完整迁移
- **WHEN** 副档案有主档案没有的岗位 link
- **THEN** 该 link（连同其 activity_records）整体迁移到主档案（candidate_id 更新）

#### Scenario: 合并后副档案软删除
- **WHEN** merge 完成
- **THEN** 副档案的 deleted_at 被设置，merged_into 指向主档案 id

## ADDED Requirements

### Requirement: InterviewRecord 模型从 ORM 中移除
`app/models.py` SHALL 不再定义 `InterviewRecord` 类（对应表 `interview_records_bak`）。`CandidateJobLink` 的 `interview_records` relationship SHALL 被删除。`app/routes/interviews.py` 文件（未挂载路由）SHALL 被删除。

#### Scenario: 服务启动不重建 interview_records 表
- **WHEN** 服务启动，SQLAlchemy 执行 `create_all`
- **THEN** 不创建 `interview_records` 空表，`interview_records_bak` 保持不变
