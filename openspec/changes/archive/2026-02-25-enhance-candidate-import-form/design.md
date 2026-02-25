## Context

当前候选人档案只存单条教育/工作经历（`education`/`school`/`last_company`/`last_title` 四个字符串字段），无英文名字段。导入弹窗预设大量空白输入框，体验差。AI prompt 也只提取最近一条经历。

## Goals / Non-Goals

**Goals:**
- 支持存储多条教育经历和工作经历
- 新增英文名字段，姓名/英文名至少一个非空
- 弹窗改为积木式 UI，AI 解析结果直接渲染为可编辑块
- 投递岗位选项显示「岗位名 @编号」
- 向后兼容：旧字段保留，自动同步为新数组第一条

**Non-Goals:**
- 不改造候选人详情页的展示（本次只改导入弹窗）
- 不迁移历史数据到新数组字段（旧数据继续用旧字段展示）
- 不改造人才库/流程跟进的列表查询逻辑

## Decisions

**1. JSON列 vs 关联表**
选 JSON 列（`education_list`, `work_experience`）。理由：无需按子字段做复杂查询，改动范围小，SQLite 支持 JSON 列。关联表改动量大且过度设计。

**2. 旧字段保留为"缓存"**
`education/school/last_company/last_title` 保留，保存时自动同步为新数组第一条。理由：列表页/流程跟进仍依赖这些字段做展示，不需要改后端查询。

**3. 名字校验在前端**
`name` 后端改为 nullable，前端保存时判断 `name` 和 `name_en` 至少一个有值，用非空的那个作为显示名。

**4. DB 迁移**
直接 ALTER TABLE 补加三列，无需迁移脚本。已在开发环境执行过，生产同步执行即可。

## Risks / Trade-offs

- [旧数据不完整] 历史候选人 `education_list`/`work_experience` 为空，详情页需兼容空数组 → 展示时降级到旧字段
- [AI 解析质量] 多条经历提取准确率依赖模型能力，可能有遗漏 → 积木块支持手动增删，用户可修正
- [name nullable] 后端 `name` 改为可空后，旧有 NOT NULL 约束需确认 SQLite 是否支持 ALTER → SQLite 不支持 ALTER COLUMN，需在应用层校验，DB 层保持原有约束不变，`name` 存英文名兜底

## Migration Plan

1. ALTER TABLE 补加 `name_en`, `education_list`, `work_experience` 三列（已执行）
2. 更新 models.py / routes / ai_client
3. 重启服务器
4. 无需回滚策略（新列为可空，不影响现有数据读写）
