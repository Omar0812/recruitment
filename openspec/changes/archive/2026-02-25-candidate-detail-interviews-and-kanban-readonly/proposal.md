## Why

候选人详情页的"投递记录"tab 只展示岗位/阶段/状态，无法查看每轮面试的具体记录；同时看板中已淘汰候选人与进行中的混排且仍可操作，导致误操作风险和信息噪音。这两个问题共同造成"候选人视角不完整、看板操作不安全"的体验缺陷。

## What Changes

- 候选人详情"投递记录" tab：每条投递记录支持展开，显示该岗位下的面试记录列表（轮次、面试官、时间、评分、评语、结论）
- 候选人详情 header：已淘汰候选人显示最近一次流程的岗位名和淘汰原因，而非"暂无"
- 看板：已淘汰/已退出（outcome=rejected/withdrawn）的候选人卡片只读化——灰化、无操作按钮，仅保留姓名链接和淘汰原因 tag
- 看板：默认隐藏已淘汰卡片，每列提供"显示已淘汰 (N)"折叠 toggle

## Capabilities

### New Capabilities
- `candidate-interview-history`: 候选人详情页内查看每条投递记录对应的面试记录列表

### Modified Capabilities
- `pipeline-kanban`: 看板卡片区分 active/inactive 状态，inactive 卡片只读且默认折叠
- `candidate-profile`: header 对已淘汰候选人展示最近流程信息而非"暂无"

## Impact

- `static/app.js`：renderCandidateProfile（投递记录 tab 展开逻辑）、renderCard（只读卡片渲染）、renderPipeline（折叠 toggle）
- `app/routes/interviews.py`：确认已有 GET /api/interviews?link_id=xxx 接口，或新增
- 无数据库 schema 变更，无破坏性改动
