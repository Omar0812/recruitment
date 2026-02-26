## MODIFIED Requirements

### Requirement: 转移岗位操作
投递记录 tab SHALL 为每条进行中的 job_link 提供「转移岗位」按钮，点击后弹窗选择目标岗位，确认后将当前 job_link 标记为 withdrawn，并新建目标岗位 job_link（简历筛选自动通过）。后端 transfer 接口 SHALL NOT 引用已废弃的 InterviewRecord 表。

#### Scenario: 转移到新岗位
- **WHEN** 用户点击某条进行中流程的「转移岗位」按钮，选择目标岗位并确认
- **THEN** 原 job_link outcome 设为 withdrawn，新建目标岗位 job_link，历史记录写入转移事件

#### Scenario: 转移后原流程状态
- **WHEN** 转移完成后
- **THEN** 原岗位流程在投递记录中显示为「已退出」，新岗位流程显示为进行中

#### Scenario: Transfer does not reference InterviewRecord
- **WHEN** transfer API is called with keep_records=true or keep_records=false
- **THEN** the backend SHALL NOT query or update the interview_records table; the keep_records parameter is accepted but has no effect on InterviewRecord
