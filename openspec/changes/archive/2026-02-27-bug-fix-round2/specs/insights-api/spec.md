## MODIFIED Requirements

### Requirement: P2 建档未分配过滤已结束流程候选人
`GET /api/insights/today` 的 P2「建档未分配」逻辑 SHALL 只包含"从未有过任何 job link"的候选人。有历史流程记录（无论 outcome 是 hired/rejected/withdrawn）的候选人 SHALL NOT 出现在未分配列表中。

#### Scenario: 入职候选人不出现在未分配列表
- **WHEN** 候选人有 outcome='hired' 的 CandidateJobLink，当前无 outcome=null 的活跃 link
- **THEN** 该候选人不出现在 P2 unassigned 列表中

#### Scenario: 退出候选人不出现在未分配列表
- **WHEN** 候选人有 outcome='withdrawn' 的历史 link，当前无活跃流程
- **THEN** 该候选人不出现在 P2 unassigned 列表中

#### Scenario: 真正未分配的候选人出现在列表中
- **WHEN** 候选人从未有过任何 CandidateJobLink（job_links 为空）
- **THEN** 该候选人出现在 P2 unassigned 列表中

#### Scenario: 进行中的候选人不出现在未分配列表
- **WHEN** 候选人有 outcome=null 的活跃 link
- **THEN** 该候选人不出现在未分配列表（已在进行中）
