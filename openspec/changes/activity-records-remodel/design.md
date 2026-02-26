## Context

当前数据模型：`interview_records` 表只服务于正式面试场景，字段包括 round/interviewer/interview_time/score/comment/conclusion/status/scheduled_at/location/rejection_reason。候选人在其他阶段（简历筛选、电话初筛、Offer 沟通）发生的事情无处记录。

`HistoryEntry` 表记录了阶段变更和 outcome 变更，但是机器语言（"stage 从面试改为 Offer"），不适合面向用户的时间轴渲染。

前端 `renderIvCard` / `renderIvFormHTML` 等函数高度耦合面试场景，扩展其他类型需要大量条件分支。

## Goals / Non-Goals

**Goals:**
- 单张 `activity_records` 表覆盖所有活动类型
- 每条记录锁定所属 stage，支持按阶段分组渲染
- stage_change 作为 activity 类型存入同一张表，时间轴只查一张表
- 前端按阶段分组展示完整生命周期
- 面试时间选择器改为日期+时间段下拉
- 淘汰/退出原因选项扩充，退出原因必选

**Non-Goals:**
- 多人协作/权限管理
- 活动记录的编辑历史
- HistoryEntry 表的清理（保留为审计日志）
- 背调（reference_check）类型（后续版本）

## Decisions

**决策1：新建表 vs 改造现有表**

选择新建 `activity_records` 表，迁移数据后删除 `interview_records`。原因：旧表字段语义强绑定面试场景（round/score），直接加 type 字段会导致大量 nullable 字段和语义混乱。新表从设计上就是多类型的，字段更清晰。

**决策2：stage_change 存 activity_records 还是 HistoryEntry**

存 `activity_records`。原因：时间轴只查一张表，无需 join，analytics 也只查一张表。HistoryEntry 保留但退化为系统审计日志，不再用于 UI 渲染。

**决策3：单向道约束在哪里执行**

前端约束：展开行只允许在当前 stage 追加活动，已过去的阶段分组不显示"添加"按钮。后端不做强约束（stage 字段由前端传入，后端只存储）。原因：业务规则可能有例外，后端强约束会增加复杂度，前端约束足够。

**决策4：推进阶段合并安排面试入口**

推进到新阶段时，根据目标阶段名称智能判断默认活动类型：
- 含"面试"→ 弹出 interview 表单
- 含"电话"/"初筛" → 弹出 phone_screen 表单
- 含"Offer" → 弹出 offer 表单
- 其他 → 弹出 note 表单（可选填）

用户也可以跳过不填，stage 变更仍然执行。

**决策5：API 路径**

新路径 `/api/activities`，废弃 `/api/interviews`。前端全部切换到新路径。旧路径不保留兼容层（数据已迁移，无外部调用方）。

**ActivityRecord 数据模型：**

```
activity_records
  id            INTEGER PK
  link_id       INTEGER FK → candidate_job_links.id
  type          TEXT  (interview/phone_screen/note/offer/stage_change)
  stage         TEXT  (创建时所在阶段，锁定)
  created_at    DATETIME

  # 公共字段
  actor         TEXT nullable  (操作人/面试官)
  comment       TEXT nullable  (备注/评语)
  conclusion    TEXT nullable  (通过/淘汰/待定)
  rejection_reason TEXT nullable

  # interview 专有
  round         TEXT nullable  (面试1/面试2...)
  interview_time DATETIME nullable
  scheduled_at  DATETIME nullable
  location      TEXT nullable
  status        TEXT nullable  (scheduled/completed/cancelled，仅interview用)
  score         INTEGER nullable

  # offer 专有
  salary        TEXT nullable
  start_date    TEXT nullable

  # stage_change 专有
  from_stage    TEXT nullable
  to_stage      TEXT nullable
```

**时间选择器方案：**

日期：`<input type="date">`
时间段：`<select>` 下拉，选项为 08:00 ~ 22:00 每15分钟一档，共57个选项。
组合后拼接为 ISO 字符串存入 `scheduled_at` / `interview_time`。

## Risks / Trade-offs

- [迁移时数据丢失] → 迁移脚本先 INSERT INTO activity_records SELECT，验证 count 一致后再 DROP TABLE interview_records
- [前端大量重构引入新 bug] → 分阶段：先完成后端迁移和 API，再重构前端，保持 API 兼容期间前端可并行测试
- [stage_change 写入时机] → pipeline.py 的 update_stage 接口写入，需确保原子性（同一事务）

## Migration Plan

1. `app/server.py` 启动时执行：
   - CREATE TABLE activity_records（如不存在）
   - INSERT INTO activity_records SELECT ... FROM interview_records（type='interview'，stage 从对应 link.stage 取）
   - 验证迁移数量
   - DROP TABLE interview_records（或 RENAME 为 interview_records_bak 保留一段时间）
2. 部署新 `/api/activities` 路由
3. 前端切换到新 API
4. 回滚：保留 interview_records_bak，可快速恢复

## Open Questions

- 迁移时 interview_records 的 stage 字段从 link.stage 取（当前阶段），历史记录的 stage 可能不准确——这个误差可接受吗？（建议接受，历史数据量小）
