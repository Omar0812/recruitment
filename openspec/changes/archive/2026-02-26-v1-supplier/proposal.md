## Why

候选人来源（source）目前是自由文本输入，无法统一管理供应商/猎头信息，也无法按供应商维度筛选和统计。需要引入结构化的 Supplier 表，将来源从自由文本升级为关联实体，支持供应商管理、快速选择和数据分析。

## What Changes

- 新增 Supplier 模型（name, type, contact_name, phone, email, notes）
- Candidate 表新增 `supplier_id` 外键，保留 `source` 字段向后兼容
- 新增 `/api/suppliers` CRUD 路由
- 导入表单"来源渠道"从自由文本改为下拉选择 + "新增供应商"快捷入口
- 候选人编辑表单同步改为下拉选择
- 人才库增加按供应商筛选
- 启动迁移：尝试将已有 source 字符串匹配到 Supplier 记录

## Capabilities

### New Capabilities
- `supplier-management`: Supplier 模型 CRUD、供应商列表页、快捷新增弹窗

### Modified Capabilities
- `import-form-ux`: 来源渠道从自由文本改为供应商下拉选择 + 快捷新增
- `candidate-api`: Candidate 新增 supplier_id 字段，返回 supplier_name
- `talent-pool-view`: 筛选器增加按供应商筛选

## Impact

- 后端：新增 `app/routes/suppliers.py`，修改 `app/models.py`（Supplier 表 + Candidate.supplier_id）、`app/server.py`（迁移）、`app/routes/candidates.py`（supplier_id 支持）
- 前端：`static/app.js` 导入表单、编辑表单、人才库筛选器改造
- 数据库：新增 suppliers 表，candidates 表新增 supplier_id 列
