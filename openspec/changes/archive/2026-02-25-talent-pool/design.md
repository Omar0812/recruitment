## Context

现有 `Candidate` 表是独立的，`CandidateJobLink` 负责候选人与岗位的绑定。候选人列表页（`#/candidates`）已存在，但强依赖岗位关联，没有"人才库"概念。

人才库本质是对 Candidate 表的重新组织和视图，不需要新表，只需新增字段和新视图。

## Goals / Non-Goals

**Goals:**
- Candidate 模型新增 `followup_status` 字段
- 新增人才库页面，展示全量候选人，支持跟进状态筛选
- 候选人详情支持设置跟进状态和跟进备注
- 从人才库可直接推荐候选人到岗位

**Non-Goals:**
- 跟进提醒/通知（不做消息推送）
- 候选人重复检测（不做去重逻辑）
- 人才库权限隔离（不做多用户权限）

## Decisions

**1. followup_status 加在 Candidate 表，而非新建表**
- 跟进状态是候选人本身的属性，与岗位无关
- 备选方案：新建 talent_pool 表 → 冗余，Candidate 表已够用

**2. 跟进状态枚举：待跟进 / 已联系 / 暂不考虑**
- 覆盖主要场景，简单够用
- 备选方案：自定义标签 → 复杂度高，当前阶段不必要

**3. 人才库复用候选人列表的卡片/行组件**
- 减少重复代码，保持 UI 一致
- 人才库与候选人列表的区别仅在于：人才库展示全量（含无岗位关联的人），并增加跟进状态列

**4. 跟进备注复用现有 Candidate.notes 字段**
- 不新增字段，notes 本来就是自由文本备注
- 在详情页新增"跟进备注"快捷编辑入口，实际写入 notes

## Risks / Trade-offs

- [followup_status 默认 NULL] → 前端展示时 NULL 视为"未设置"，不影响存量数据
- [人才库与候选人列表功能重叠] → 明确定位：候选人列表是"流程视角"，人才库是"人才资产视角"

## Migration Plan

1. `ALTER TABLE candidates ADD COLUMN followup_status VARCHAR`
2. 部署新后端代码
3. 前端新增导航入口和页面，刷新即生效
