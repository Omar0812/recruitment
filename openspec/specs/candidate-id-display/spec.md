## ADDED Requirements

### Requirement: 候选人编号展示
系统 SHALL 将候选人 id 格式化为 `C{id:03d}` 编号（如 C001、C042），在姓名旁展示为「张三 @C042」或「Sam Zhang @C042」。

#### Scenario: 有中文名
- **WHEN** 候选人有 name 字段
- **THEN** 展示为「{name} @C{id:03d}」

#### Scenario: 只有英文名
- **WHEN** 候选人 name 为空，name_en 有值
- **THEN** 展示为「{name_en} @C{id:03d}」

#### Scenario: 中英文名都有
- **WHEN** 候选人 name 和 name_en 均有值
- **THEN** 主标题显示「{name} @C{id:03d}」，副标题显示英文名
