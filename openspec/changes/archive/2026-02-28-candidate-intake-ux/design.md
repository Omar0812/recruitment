## Context

当前候选人创建流程存在功能断裂：`/api/resume/upload` 只做解析返回 `parsed` 字段，不创建候选人；但 `Talent.vue` 的 `onUploadSuccess` 直接 toast "已创建成功"并刷新列表——候选人实际从未入库。此外完全缺少手动建档路径，Today 页也没有快捷创建入口。

后端已具备所需能力：`POST /api/candidates` 支持 `resume_path` 可选，`/api/resume/upload` 返回完整 `parsed` 对象（含 name/phone/education_list/work_experience 等）。

## Goals / Non-Goals

**Goals:**
- 修复候选人未真正入库的 bug
- 新建 `CreateCandidateDialog.vue` 共享组件，统一创建路径
- Today 页 header 加快捷入口
- Talent 页替换原上传逻辑为新组件

**Non-Goals:**
- 不改后端 API
- 不改 CandidateDetail 编辑表单（已有完整实现）
- 不做批量导入
- 不改查重逻辑（查重已在 dedup 页实现）

## Decisions

### 决策 1：上传和手动建档合并为一个弹窗组件

**选择**：新建 `CreateCandidateDialog.vue`，内含上传区 + 可折叠的手动填写区，AI 解析后自动展开并预填。

**理由**：两种路径的确认表单字段完全相同，合并避免重复代码，也让 UX 保持一致——无论哪种路径，用户都必须经过同一张确认表单才能入库。

**备选**：两个独立弹窗 → 被排除，因为表单字段 100% 重叠，维护成本高。

### 决策 2：手动填写区默认折叠，AI 解析后自动展开

**选择**：弹窗默认只显示上传区，手动填写区折叠（`[∨] 手动填写基础信息`）；上传成功 AI 解析完毕后自动展开并预填字段。

**理由**：减少冷启动信息量，让上传路径作为主视觉引导；有简历的用户不需要看到空表单；没有简历的用户主动点击展开，意图明确。

### 决策 3：上传用 axios 手动调用，不用 el-upload 的 action 属性

**选择**：`el-upload` 设置 `:auto-upload="false"`，手动在 `onChange` 里调用 `/api/resume/upload`，拿到 `parsed` 后填入表单。

**理由**：`el-upload` 的 `action` 属性在上传成功后无法捕获到完整响应体做后续处理（`on-success` 拿到的是 response data，但控制流已结束）。手动调用更容易在上传完成后执行「展开表单 + 预填字段」的逻辑。

**备选**：继续用 `action` + `on-success` → 被排除，因为这正是现有 bug 的根源：on-success 里缺少后续创建步骤。

### 决策 4：姓名必填，其他字段可选

**选择**：`name` 为唯一必填字段，提交时校验非空。

**理由**：高阶人选可能只有姓名，后续信息逐步补充；后端 `create_candidate` 已有同样约束（name 为空返回 400）。

## Risks / Trade-offs

- **AI 解析质量**：解析结果可能不准确，因此必须让用户经过确认步骤，不能跳过。→ 弹窗中字段均可编辑，用户确认后才提交。
- **resume_path 关联**：上传后得到 `resume_path`，需在后续 `POST /api/candidates` 时带上，否则简历文件孤儿化。→ 上传完将 `resume_path` 存入组件状态，提交时带入。
- **弹窗重置**：关闭弹窗后需清空表单和上传状态，避免残留数据影响下次打开。→ `@close` 事件里重置所有 ref。
