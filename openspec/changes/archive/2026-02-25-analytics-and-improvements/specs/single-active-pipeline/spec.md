## ADDED Requirements

### Requirement: 候选人单活跃流程限制
后端 `POST /api/pipeline/link` SHALL 检查候选人是否已有任意岗位的活跃关联（`outcome IS NULL`），若存在则返回 400 并在错误信息中包含当前所在岗位名称。

#### Scenario: 投递新岗位时已有活跃流程
- **WHEN** HR 尝试将候选人投递到任意岗位，且该候选人已有活跃关联
- **THEN** 系统返回 400，提示"该候选人已在「XX岗位」流程中，请先结束再投递新岗位"

#### Scenario: 无活跃流程时可正常投递
- **WHEN** 候选人当前没有任何活跃关联（所有 link 均有 outcome）
- **THEN** 系统允许创建新的关联记录

#### Scenario: 前端显示拦截提示
- **WHEN** 投递请求返回 400 单活跃流程错误
- **THEN** 前端显示具体错误信息，不关闭弹窗，HR 可取消操作
