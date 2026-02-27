# resume-dedup Specification

## Purpose
TBD - created by archiving change resume-dedup. Update Purpose after archive.
## Requirements
### Requirement: 简历导入重复检测
系统 SHALL 在简历确认弹窗中检测是否存在重复候选人，并提示 HR 处理。

#### Scenario: 检测到手机号重复
- **WHEN** 解析简历得到手机号，且系统中已有相同手机号的候选人
- **THEN** 弹窗顶部显示重复警告，列出匹配候选人的姓名、手机、邮箱、上家公司

#### Scenario: 检测到邮箱重复
- **WHEN** 解析简历得到邮箱，且系统中已有相同邮箱的候选人
- **THEN** 弹窗顶部显示重复警告，列出匹配候选人信息

#### Scenario: 检测到姓名+上家公司重复
- **WHEN** 解析简历得到姓名和上家公司，且系统中已有相同姓名+上家公司的候选人
- **THEN** 弹窗顶部显示重复警告，列出匹配候选人信息

#### Scenario: 无重复
- **WHEN** 解析结果与系统中所有候选人均不匹配
- **THEN** 弹窗正常显示，无警告，流程不变

### Requirement: 重复候选人处理选项
系统 SHALL 在检测到重复时提供"更新已有档案"和"仍然新建"两个操作。

#### Scenario: 选择更新已有档案
- **WHEN** HR 点击"更新已有档案"按钮
- **THEN** 系统将解析信息中的非空字段 PATCH 到已有候选人，更新 resume_path，关闭弹窗并跳转到该候选人详情页

#### Scenario: 选择仍然新建
- **WHEN** HR 点击"仍然新建"按钮
- **THEN** 系统忽略重复警告，按正常流程创建新候选人档案

### Requirement: 查重过滤软删除候选人
查重接口 SHALL 只匹配未被软删除（`deleted_at IS NULL`）的候选人，已合并的副档案不触发重复警告。

#### Scenario: 已合并的副档案不触发重复
- **WHEN** 解析简历得到手机号，且该手机号对应的候选人已被软删除（merged_into 不为 null）
- **THEN** 弹窗不显示重复警告

### Requirement: 合并后刷新人才库列表
系统 SHALL 在候选人合并完成后，若当前页面为人才库页面，自动刷新列表。

#### Scenario: 合并后在人才库页面
- **WHEN** HR 在人才库页面完成候选人合并操作
- **THEN** 人才库列表自动刷新，被合并的副档案不再显示

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

### Requirement: InterviewRecord 模型从 ORM 中移除
`app/models.py` SHALL 不再定义 `InterviewRecord` 类（对应表 `interview_records_bak`）。`CandidateJobLink` 的 `interview_records` relationship SHALL 被删除。`app/routes/interviews.py` 文件（未挂载路由）SHALL 被删除。

#### Scenario: 服务启动不重建 interview_records 表
- **WHEN** 服务启动，SQLAlchemy 执行 `create_all`
- **THEN** 不创建 `interview_records` 空表，`interview_records_bak` 保持不变


