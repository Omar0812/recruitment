# timestamp-localization Specification

## Purpose
TBD - created by archiving change fix-bugs-and-product-improvements. Update Purpose after archive.
## Requirements
### Requirement: 前端时间戳本地化显示
前端 SHALL 提供统一的时间格式化函数，将 ISO UTC 时间字符串转换为本地时间（UTC+8）显示，格式为 `YYYY-MM-DD HH:mm`。

#### Scenario: 时间戳转换为本地时间
- **WHEN** 后端返回 UTC 时间字符串（如 "2024-01-15T02:30:00"）
- **THEN** 前端显示为本地时间（如 "2024-01-15 10:30"，UTC+8）

#### Scenario: 时间戳为 null 时
- **WHEN** 时间字段值为 null 或空字符串
- **THEN** 前端显示"-"，不报错

#### Scenario: 所有时间显示场景统一
- **WHEN** HR 查看候选人历史记录、看板卡片更新时间、流程跟进最后更新时间
- **THEN** 所有时间均以本地时间显示，不再显示 UTC 时间

