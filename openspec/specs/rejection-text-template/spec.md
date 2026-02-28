## ADDED Requirements

### Requirement: 拒信文本模板管理
系统 SHALL 支持在设置页编辑拒信文本模板，支持变量替换。

支持变量：`{{candidate_name}}` `{{job_title}}`

#### Scenario: 编辑拒信模板
- **WHEN** 用户在设置页修改拒信模板文本后保存
- **THEN** 模板内容更新至 config.json，下次生成时使用新模板

### Requirement: 淘汰后生成拒信文本
系统 SHALL 在候选人被淘汰操作完成后，在 Pipeline 展开区提供「复制拒信」按钮，生成拒信文本并复制到剪贴板。

#### Scenario: 淘汰后显示复制拒信入口
- **WHEN** 用户对候选人执行淘汰操作成功后
- **THEN** Pipeline 展开区显示「复制拒信」按钮

#### Scenario: 复制拒信文本
- **WHEN** 用户点击「复制拒信」
- **THEN** 使用拒信模板替换变量（候选人姓名、岗位名），写入剪贴板，显示"已复制"提示
