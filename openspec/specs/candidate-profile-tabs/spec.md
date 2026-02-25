## ADDED Requirements

### Requirement: 详情页 Header + 三 Tab 结构
候选人详情页 SHALL 由固定 header 和三个 tab（简历背景/投递记录/历史记录）组成，默认激活「简历背景」tab。

#### Scenario: 默认打开简历背景
- **WHEN** 用户进入候选人详情页
- **THEN** 「简历背景」tab 默认激活，显示工作经历和教育经历

#### Scenario: 切换 tab
- **WHEN** 用户点击「投递记录」tab
- **THEN** 显示该候选人所有岗位流程，隐藏其他 tab 内容

### Requirement: Header 信息组成
Header SHALL 展示：姓名（含编号）、英文名（若有）、最近工作经历（职位@公司）、最高学历（学历·院校）、联系方式（手机·邮箱）、最近一条进行中流程、跟进状态下拉。无头像。

#### Scenario: 有进行中流程
- **WHEN** 候选人有 outcome 为空的 job_link
- **THEN** Header 显示最近一条进行中流程：「{岗位名} #{编号} → {阶段} · {N天前}」

#### Scenario: 无进行中流程
- **WHEN** 候选人所有 job_link 均有 outcome
- **THEN** Header 显示「当前流程：暂无」
