## Context

当前候选人来源（source）是自由文本字段，HR 手动输入"Boss直聘""猎头A"等字符串。无法统一管理供应商信息、无法按供应商维度筛选统计。

现有数据：Candidate.source 已有大量历史数据，需要向后兼容。

## Goals / Non-Goals

**Goals:**
- 新增 Supplier 表，支持供应商 CRUD
- Candidate 关联 supplier_id，导入/编辑时从下拉选择
- 人才库支持按供应商筛选
- 历史 source 数据保留，不强制迁移

**Non-Goals:**
- 不做供应商独立管理页面（本期只做下拉选择 + 快捷新增弹窗）
- 不做供应商绩效统计（后续迭代）
- 不做 source 字段自动迁移到 supplier_id（保留 source 向后兼容）

## Decisions

### D1: Supplier 模型设计
Supplier 表字段：id, name, type(猎头/招聘平台/内推/其他), contact_name, phone, email, notes, created_at。
type 用字符串枚举，前端下拉选择。

**理由**：字段精简，覆盖常见供应商信息。type 用字符串而非外键，避免过度设计。

### D2: Candidate 关联方式
Candidate 新增 `supplier_id` 外键（nullable），保留 `source` 字段。
- 新导入的候选人：选择供应商时写 supplier_id，source 自动填充为供应商名称
- 历史候选人：source 保持不变，supplier_id 为 null

**理由**：向后兼容，不破坏现有数据。source 字段作为冗余展示字段保留。

### D3: 前端供应商选择交互
导入表单和编辑表单的"来源渠道"改为 `<select>` + "新增供应商"按钮。
- 下拉列表从 `/api/suppliers` 加载
- "新增供应商"打开轻量弹窗（只需填 name + type），保存后自动选中
- 保留一个"其他（手动输入）"选项，选中后显示文本框

**理由**：最小改动实现结构化，同时保留灵活性。

### D4: 人才库筛选
人才库现有"来源"下拉改为从 suppliers 表加载，附加"未关联供应商"选项。

**理由**：统一数据源，筛选更准确。

## Risks / Trade-offs

- [历史数据不迁移] → 人才库筛选按 supplier_id，历史候选人（supplier_id=null）只能通过"未关联供应商"看到。可接受，后续可手动关联。
- [source 字段冗余] → 保留 source 是为了向后兼容和展示便利，长期可考虑废弃。
