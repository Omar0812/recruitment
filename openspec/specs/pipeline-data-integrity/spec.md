# pipeline-data-integrity Specification

## Purpose
TBD - created by archiving change fix-bugs-and-product-improvements. Update Purpose after archive.
## Requirements
### Requirement: 看板过滤软删除候选人
看板接口 SHALL 在返回活跃候选人列表时过滤已软删除（`deleted_at IS NOT NULL`）的候选人。

#### Scenario: 已合并候选人不出现在看板
- **WHEN** HR 查看某岗位看板
- **THEN** 已被合并软删除的候选人不出现在任何阶段列

#### Scenario: 正常候选人正常显示
- **WHEN** HR 查看某岗位看板
- **THEN** 未被删除的活跃候选人正常显示在对应阶段

### Requirement: 重复投递防护
后端 `POST /api/pipeline/link` SHALL 检查候选人是否已有该岗位的活跃关联（`outcome IS NULL`），若存在则返回 400 错误。

#### Scenario: 重复投递同一岗位
- **WHEN** HR 尝试将候选人投递到其已有活跃关联的岗位
- **THEN** 系统返回 400，提示"该候选人已在此岗位流程中"

#### Scenario: 已淘汰后可重新投递
- **WHEN** 候选人在某岗位已被淘汰（outcome = "rejected"），HR 再次投递该岗位
- **THEN** 系统允许创建新的关联记录

