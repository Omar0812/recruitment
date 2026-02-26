## ADDED Requirements

### Requirement: 候选人详情流程 tab 使用岗位真实阶段
候选人详情页"流程" tab 的时间轴 SHALL 使用当前活跃 link 对应岗位的真实 `job_stages`，而非硬编码的默认阶段列表。

#### Scenario: 自定义阶段岗位时间轴正确显示
- **WHEN** 候选人当前流程所在岗位的 `stages` 为 `["初筛", "技术面", "HR面", "Offer"]`
- **THEN** 时间轴显示这 4 个阶段，当前阶段高亮正确

#### Scenario: 无自定义阶段时 fallback 到默认
- **WHEN** `job_links` 中的 `job_stages` 为空或不存在
- **THEN** 时间轴 fallback 到默认阶段 `["简历筛选", "电话初筛", "面试", "Offer", "已入职"]`

#### Scenario: 当前阶段不在阶段列表时不崩溃
- **WHEN** `activeLink.stage` 不在 `job_stages` 中（indexOf 返回 -1）
- **THEN** 时间轴正常渲染，不抛出 JS 错误
