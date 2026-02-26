## Purpose
定义流程跟进页面的展示和交互规范，提供所有活跃候选人的统一分组视图。

## Requirements

### Requirement: 流程跟进页面展示所有活跃人选
系统 SHALL 提供流程跟进页面，以分组卡片形式展示所有当前在招聘流程中（outcome 为 NULL）的候选人。默认按岗位分组，支持切换为按阶段分组。每个分组为独立卡片，内部表格显示姓名、阶段（按岗位分组时）或岗位（按阶段分组时）、最后更新时间、快捷操作。

#### Scenario: 默认按岗位分组查看
- **WHEN** HR 进入流程跟进页面
- **THEN** 系统以岗位为分组展示卡片，每张卡片标题为岗位名和人数，内部列出该岗位所有活跃候选人

#### Scenario: 切换为按阶段分组
- **WHEN** HR 点击"按阶段"切换按钮
- **THEN** 系统以阶段为分组展示卡片，每张卡片标题为阶段名和人数，内部列出该阶段所有活跃候选人及其所属岗位

#### Scenario: 切换回按岗位分组
- **WHEN** HR 点击"按岗位"切换按钮
- **THEN** 系统恢复按岗位分组视图

#### Scenario: 无活跃人选
- **WHEN** 系统中没有任何活跃候选人-岗位关联
- **THEN** 系统显示"暂无进行中的人选"空状态

### Requirement: 搜索跨分组过滤
系统 SHALL 支持跨分组搜索候选人姓名，搜索结果过滤后空分组自动隐藏。

#### Scenario: 搜索过滤候选人
- **WHEN** HR 在搜索框输入关键词
- **THEN** 所有分组中匹配的候选人保留，无匹配候选人的分组卡片隐藏

#### Scenario: 搜索候选人姓名为 null 时不崩溃
- **WHEN** HR 在搜索框输入关键词，且列表中存在 candidate_name 为 null 的记录
- **THEN** 系统跳过该记录继续过滤，不抛出 TypeError

### Requirement: 分组内快捷操作
每条候选人记录 SHALL 提供展开行操作（推进阶段、安排面试、退出、转岗）。

#### Scenario: 快捷淘汰
- **WHEN** HR 点击"淘汰"按钮
- **THEN** 系统弹出淘汰原因选择弹窗，确认后更新该候选人-岗位关联的 outcome 为 rejected

### Requirement: Withdraw removes candidate from active list
After a candidate withdraws, they SHALL be immediately removed from the in-progress list without requiring a page refresh.

#### Scenario: Withdraw confirmed
- **WHEN** user confirms withdrawal in the withdraw overlay
- **THEN** the candidate's link entry is removed from the local links array and the list re-renders without that candidate

#### Scenario: Hire confirmed
- **WHEN** user confirms hire in the hire overlay
- **THEN** the candidate's link entry is removed from the local links array and the list re-renders without that candidate

### Requirement: Stage dropdown has no duplicate 已入职 option
The stage dropdown in the expanded row SHALL show each stage exactly once, with a single "已入职" option at the end that triggers the hire confirmation overlay.

#### Scenario: Job stages contain 已入职
- **WHEN** a job's stages array includes "已入职"
- **THEN** the dropdown renders it only once (the hardcoded __hire__ option), not twice

#### Scenario: Job stages do not contain 已入职
- **WHEN** a job's stages array does not include "已入职"
- **THEN** the dropdown renders all job stages plus one "已入职" option at the end
