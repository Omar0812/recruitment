## Context

候选人详情页当前是线性卡片堆叠，无信息层级。编号、tab、转移岗位、快捷淘汰均缺失。years_exp 为 Integer，无法存 0.5 年精度。

## Goals / Non-Goals

**Goals:**
- 候选人自动生成 C001 格式编号，全局唯一
- 详情页重构为 header + 三 tab（简历背景/投递记录/历史记录）
- 工作年限支持 0.5 精度
- 投递记录 tab 支持推进阶段、转移岗位、淘汰+面评
- 历史记录带岗位名称
- 流程跟进表格加快捷淘汰按钮

**Non-Goals:**
- 不做候选人头像上传
- 不改人才库列表页结构
- 不做查重合并（单独 change）

## Decisions

**1. 编号生成**
用数据库自增 id 直接格式化为 `C{id:03d}`，不新增字段。理由：id 已唯一，格式化展示即可，无需维护额外序列。

**2. Tab 实现**
纯前端 JS 切换，不用路由。默认激活"简历背景"。tab 状态不持久化（刷新回默认）。

**3. 转移岗位**
点击后弹窗选目标岗位+初始阶段，确认后：当前 job_link 标 `outcome=withdrawn`，新建目标岗位 job_link。复用现有 `/api/pipeline/link` 和 `/api/pipeline/{link_id}` PATCH 接口。

**4. 快捷淘汰+面评**
流程跟进表格淘汰按钮复用现有 `#reject-overlay` 弹窗，淘汰后可选填面试记录（复用 `#interview-overlay`）。两步弹窗：先淘汰原因，再询问是否补填面评。

**5. years_exp Float**
SQLite 动态类型，直接存 float 无需 ALTER TABLE。Python 模型改为 Float，API schema 改为 Optional[float]。

## Risks / Trade-offs

- [tab 状态不持久] 刷新后回到简历背景 tab → 可接受，用户习惯默认 tab
- [转移岗位后旧流程标 withdrawn] 旧流程历史记录仍保留 → 符合预期，历史可追溯
- [快捷淘汰两步弹窗] 操作略多 → 面评是可选的，可直接跳过

## Migration Plan

1. 更新 models.py Float 类型（SQLite 兼容，无需迁移）
2. 更新 API schema
3. 重构前端 renderCandidateProfile
4. 更新 renderPipelineTracking 加淘汰按钮
5. 重启服务器
