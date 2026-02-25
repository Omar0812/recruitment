## MODIFIED Requirements

### Requirement: 候选人导航入口改名为流程跟进
导航栏中"候选人"入口 SHALL 改名为"流程跟进"，路由从 `#/candidates` 保持不变，新增 `#/pipeline` 路由指向流程跟进页面，`#/candidates` 重定向到 `#/pipeline`。

#### Scenario: 点击导航流程跟进
- **WHEN** HR 点击导航栏"流程跟进"
- **THEN** 系统跳转到流程跟进页面（`#/pipeline`）

#### Scenario: 旧路由兼容
- **WHEN** 用户访问 `#/candidates`
- **THEN** 系统重定向到 `#/pipeline`
