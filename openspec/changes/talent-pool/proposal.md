## Why

现有系统中候选人与岗位强绑定，被淘汰或未关联岗位的候选人在系统中几乎不可见。公司积累的人脉资产（猎头推荐、主动sourcing、历史候选人）无法沉淀复用，每次招聘都要重新找人。

## What Changes

- 新增人才库视图，展示所有候选人（不依赖岗位关联）
- 候选人支持打标签（技能标签已有，新增"跟进状态"标签）
- 支持标记候选人为"待跟进"，并记录跟进备注
- 候选人列表支持按跟进状态、技能标签、来源筛选
- 候选人可从人才库直接推荐到某个岗位（关联岗位）

## Capabilities

### New Capabilities
- `talent-pool-view`: 人才库视图，展示全量候选人，支持多维筛选和跟进状态管理
- `candidate-followup`: 候选人跟进状态（待跟进/已联系/暂不考虑）和跟进备注

### Modified Capabilities
- `candidate-profile`: 候选人详情新增跟进状态字段和跟进备注入口

## Impact

- 后端：Candidate 模型新增 `followup_status` 字段（待跟进/已联系/暂不考虑）
- 后端：候选人列表 API 支持按 followup_status 筛选
- 前端：新增人才库页面（`#/talent`），复用候选人卡片组件
- 前端：导航栏新增"人才库"入口
