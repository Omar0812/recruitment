# resume-dedup Specification

## Purpose
TBD - created by archiving change resume-dedup. Update Purpose after archive.
## Requirements
### Requirement: 简历导入重复检测
系统 SHALL 在简历确认弹窗中检测是否存在重复候选人，并提示 HR 处理。

#### Scenario: 检测到手机号重复
- **WHEN** 解析简历得到手机号，且系统中已有相同手机号的候选人
- **THEN** 弹窗顶部显示重复警告，列出匹配候选人的姓名、手机、邮箱、上家公司

#### Scenario: 检测到邮箱重复
- **WHEN** 解析简历得到邮箱，且系统中已有相同邮箱的候选人
- **THEN** 弹窗顶部显示重复警告，列出匹配候选人信息

#### Scenario: 检测到姓名+上家公司重复
- **WHEN** 解析简历得到姓名和上家公司，且系统中已有相同姓名+上家公司的候选人
- **THEN** 弹窗顶部显示重复警告，列出匹配候选人信息

#### Scenario: 无重复
- **WHEN** 解析结果与系统中所有候选人均不匹配
- **THEN** 弹窗正常显示，无警告，流程不变

### Requirement: 重复候选人处理选项
系统 SHALL 在检测到重复时提供"更新已有档案"和"仍然新建"两个操作。

#### Scenario: 选择更新已有档案
- **WHEN** HR 点击"更新已有档案"按钮
- **THEN** 系统将解析信息中的非空字段 PATCH 到已有候选人，更新 resume_path，关闭弹窗并跳转到该候选人详情页

#### Scenario: 选择仍然新建
- **WHEN** HR 点击"仍然新建"按钮
- **THEN** 系统忽略重复警告，按正常流程创建新候选人档案

### Requirement: 查重过滤软删除候选人
查重接口 SHALL 只匹配未被软删除（`deleted_at IS NULL`）的候选人，已合并的副档案不触发重复警告。

#### Scenario: 已合并的副档案不触发重复
- **WHEN** 解析简历得到手机号，且该手机号对应的候选人已被软删除（merged_into 不为 null）
- **THEN** 弹窗不显示重复警告

### Requirement: 合并后刷新人才库列表
系统 SHALL 在候选人合并完成后，若当前页面为人才库页面，自动刷新列表。

#### Scenario: 合并后在人才库页面
- **WHEN** HR 在人才库页面完成候选人合并操作
- **THEN** 人才库列表自动刷新，被合并的副档案不再显示

