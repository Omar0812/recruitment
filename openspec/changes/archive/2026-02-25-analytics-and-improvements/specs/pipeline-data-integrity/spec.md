## ADDED Requirements

### Requirement: 单活跃流程后端拦截
后端 `POST /api/pipeline/link` SHALL 检查候选人是否已有任意岗位的活跃关联（不限于同一岗位），若存在则返回 400。

#### Scenario: 候选人已有活跃流程时拦截
- **WHEN** HR 投递候选人到任意岗位，且该候选人已有活跃关联
- **THEN** 系统返回 400，错误信息包含当前所在岗位名称
