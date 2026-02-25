## ADDED Requirements

### Requirement: Job type field
Job 模型 SHALL 支持 `type` 字段，可选值为「全职/实习/顾问」，默认为空。

#### Scenario: 创建岗位时设置类型
- **WHEN** 用户在新建岗位表单选择岗位类型
- **THEN** 岗位保存后 type 字段存储对应值

#### Scenario: 列表副标题显示类型
- **WHEN** 岗位有 type 值
- **THEN** 职位名称副标题显示「城市 · 部门 · 类型」

#### Scenario: 类型筛选
- **WHEN** 用户从筛选栏选择某个类型
- **THEN** 列表仅显示该类型的岗位
