## 1. 后端：Supplier 模型和路由

- [x] 1.1 `app/models.py`: 新增 Supplier 模型（id, name, type, contact_name, phone, email, notes, created_at）
- [x] 1.2 `app/models.py`: Candidate 表新增 `supplier_id` 外键（nullable，关联 suppliers.id），新增 supplier relationship
- [x] 1.3 `app/routes/suppliers.py`: 新建路由文件，实现 GET（列表+搜索）、POST、PATCH、DELETE 四个端点
- [x] 1.4 `app/routes/suppliers.py`: DELETE 端点校验——如果供应商已被候选人关联则返回 400
- [x] 1.5 `app/server.py`: 注册 suppliers 路由，添加启动迁移（CREATE TABLE suppliers + ALTER TABLE candidates ADD COLUMN supplier_id）
- [x] 1.6 `app/routes/candidates.py`: candidate_to_dict 返回 `supplier_name`（通过 relationship 或 join 获取）
- [x] 1.7 `app/routes/candidates.py`: POST/PATCH 接口支持 `supplier_id` 字段，保存时自动将 source 填充为供应商名称

## 2. 前端：导入表单来源改造

- [x] 2.1 `static/app.js`: uploadAndConfirm 中"来源渠道"从 `<input>` 改为 `<select>` + "新增供应商"按钮 + "其他（手动输入）"选项
- [x] 2.2 `static/app.js`: 弹窗加载时从 `/api/suppliers` 获取供应商列表填充下拉
- [x] 2.3 `static/app.js`: 选择"其他"时显示手动输入文本框，选择供应商时隐藏
- [x] 2.4 `static/app.js`: 保存候选人时，选了供应商→传 supplier_id，选了"其他"→传 source 文本
- [x] 2.5 `static/app.js`: 实现"新增供应商"轻量弹窗（name 必填 + type 下拉），保存后刷新下拉并自动选中

## 3. 前端：候选人编辑表单来源改造

- [x] 3.1 `static/app.js`: 候选人编辑弹窗"来源渠道"从 `<input>` 改为供应商下拉选择器（复用导入表单逻辑）
- [x] 3.2 `static/app.js`: 编辑弹窗加载时，当前 supplier_id 对应的供应商被选中；无 supplier_id 时显示"其他"并填充 source

## 4. 前端：人才库供应商筛选

- [x] 4.1 `static/app.js`: 人才库"来源"下拉改为从 `/api/suppliers` 加载，附加"全部"和"未关联供应商"选项
- [x] 4.2 `static/app.js`: 筛选逻辑改为按 supplier_id 过滤（后端或前端），"未关联供应商"过滤 supplier_id 为 null 的候选人
- [x] 4.3 `static/app.js`: 人才库表格"来源"列优先显示 supplier_name，无则显示 source
