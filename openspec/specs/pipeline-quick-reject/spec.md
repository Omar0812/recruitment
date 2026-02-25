## ADDED Requirements

### Requirement: 流程跟进快捷淘汰
流程跟进表格 SHALL 为每行提供「淘汰」按钮，点击后弹出淘汰原因选择，确认后将对应 job_link 标记为 rejected，并询问是否补填面试记录。

#### Scenario: 直接淘汰不填面评
- **WHEN** 用户点击「淘汰」，选择淘汰原因，跳过面评
- **THEN** job_link outcome=rejected，rejection_reason 保存，该行从流程跟进列表消失

#### Scenario: 淘汰并填写面评
- **WHEN** 用户点击「淘汰」，选择淘汰原因，选择补填面评，填写面试记录
- **THEN** job_link outcome=rejected，同时新建一条 interview_record，conclusion=淘汰
