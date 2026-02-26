## Context

招聘管理工具 v1 重构第二批。第一批 bugfixes 已完成。当前系统存在冗余活动类型（phone_screen）、假功能字段（Job.stages/interview_rounds）、导入跳转断裂、Next Step 选项过多等问题。本批次做产品简化，为第三批新增能力（onboard/已入职页）扫清障碍。

技术栈：FastAPI + SQLAlchemy + SQLite，前端原生 JS 单文件 app.js（~2750行）。

## Goals / Non-Goals

**Goals:**
- 删除 phone_screen 活动类型，减少用户认知负担
- 删除 Job.stages 和 interview_rounds 假功能字段，简化数据模型
- 简历筛选补全筛选人（actor）字段
- 导入后智能跳转（选了岗位→进行中页展开；没选→人才库）
- 弹窗按钮清理（删多余保存按钮、删初始阶段选择器）
- Next Step 每节点最多2选项

**Non-Goals:**
- CSS 设计系统（2.9）和交互布局优化（2.10）留到后续 change
- Supplier 供应商表（2.8）独立 change
- 前端模块化拆分（第四批）

## Decisions

### D1: SQLite 列删除策略
使用 SQLAlchemy 启动时自动检测并删除列。SQLite 3.35+（macOS 自带 3.39+）支持 `ALTER TABLE DROP COLUMN`。在 main.py 启动时执行迁移脚本，用 try/except 包裹 DROP COLUMN，已删除则跳过。

**替代方案**: 重建表（CREATE TABLE new → INSERT → DROP old → RENAME）。过于复杂，且目标环境 SQLite 版本足够新。

### D2: 已有 phone_screen 记录处理
数据库中已有的 phone_screen 记录保留不动。前端渲染时将 phone_screen 当作 interview 的变体显示（标签仍显示"电话初筛"），但不再允许创建新的。CHAIN_TYPES 和 STAGE_LABEL 保留 phone_screen 的标签映射用于历史数据展示，但 renderNextStep 不再提供 phone_screen 选项。

**替代方案**: 批量迁移 phone_screen → interview。风险高，可能破坏历史数据语义。

### D3: 进度点改为活动链派生
删除 job_stages 依赖后，进度点直接从活动链生成：每个已完成的 chain activity 一个实心点，当前活动一个空心点。不再需要预定义阶段列表。

### D4: Next Step 简化逻辑
```
resume_review 通过 → 主：安排面试（默认展开表单）| 备选：直接发Offer（文字链）
interview 通过   → 主：安排下一轮（默认展开表单）| 备选：发Offer（文字链）
offer 接受       → 唯一：确认入职
```
每个节点最多2个选项，主操作默认展开，备选用文字链。

### D5: 导入后跳转
uploadAndConfirm 保存成功后：
- 选了岗位 → `location.hash = '#/pipeline?expand={linkId}'`，进行中页解析 URL 参数自动展开
- 没选岗位 → `location.hash = '#/talent'`，toast "已入库"

进行中页 renderPipelineTracking 在初始化时检查 `expand` URL 参数。

## Risks / Trade-offs

- [phone_screen 历史数据] → 保留标签映射，前端仍能正确渲染历史记录
- [SQLite DROP COLUMN 兼容性] → macOS 自带 3.39+，Linux 服务器需确认版本 ≥ 3.35；迁移脚本用 try/except 兜底
- [进度点视觉变化] → 从固定阶段列表变为动态活动链，用户可能需要适应；但更准确反映实际流程
