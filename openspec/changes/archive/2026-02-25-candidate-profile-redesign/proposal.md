## Why

候选人详情页信息架构混乱、无重心，缺少编号区分同名候选人，工作年限精度不足，流程跟进表格缺少快捷淘汰入口，历史记录缺少岗位上下文。这些问题在日常使用中频繁造成困扰，需要系统性重构。

## What Changes

- 新增候选人编号（`C001` 格式），姓名显示为「张三 @C042」
- 候选人详情页重构为 header + 三 tab 结构（简历背景/投递记录/历史记录）
- Header 展示：姓名/英文名/编号、最近工作、最高学历、联系方式、最近一条进行中流程、跟进状态
- 工作年限字段从 Integer 改为 Float，精确到 0.5 年
- 历史记录展示补充岗位名称上下文
- 投递记录 tab：展示所有岗位流程，支持推进阶段、转移岗位、淘汰+面评操作
- 流程跟进表格新增「淘汰」快捷按钮，点击弹出淘汰原因+面评弹窗

## Capabilities

### New Capabilities
- `candidate-id-display`: 候选人编号生成与展示（C001格式，姓名@编号）
- `candidate-profile-tabs`: 详情页 header + 三 tab 信息架构
- `candidate-job-transfer`: 投递记录 tab 内的转移岗位操作
- `pipeline-quick-reject`: 流程跟进表格快捷淘汰+面评

### Modified Capabilities
- `candidate-profile`: header 信息重组，去头像，加编号/学历/最近流程
- `candidate-rich-profile`: 工作年限从 Integer 改为 Float

## Impact

- `app/models.py`: Candidate.years_exp 改为 Float
- `app/routes/candidates.py`: CandidateCreate/Update years_exp 类型更新，candidate_to_dict 加编号字段
- `app/ai_client.py`: EXTRACT_PROMPT 工作年限改为精确到 0.5
- `static/app.js`: renderCandidateProfile 完整重构，renderPipelineTracking 加淘汰按钮
- SQLite DB: years_exp 列类型变更（SQLite 动态类型，直接存 float 即可，无需 ALTER）
