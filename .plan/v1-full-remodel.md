# 招聘管理工具 v1 全面重构计划

## 背景

经过完整的产品审查、场景模拟和代码分析，识别出以下核心问题：
- 用户旅程多处断裂（导入后跳转、面试通过后卡死、转移岗位不刷新）
- 活动类型冗余（phone_screen本质是面试）
- 入职流程缺失后半段（Offer→正式入职之间无过渡）
- 无设计系统（200+处inline style，视觉不一致）
- 交互效率低（高频操作6步，信息优先级倒置）
- 前端2752行单文件，维护风险高
- Job.stages/interview_rounds是假功能

---

## 第一批：修Bug + 堵漏洞

### 1.1 Offer接受后取消hire弹窗导致卡死
- 文件：`static/app.js` renderExpandInner → renderNextStep
- 问题：offer.conclusion="接受"保存后，用户取消hire弹窗，outcome仍为null，但renderNextStep对offer类型没有下一步选项，用户卡死
- 修复：offer接受后如果outcome仍为null，显示"确认入职"按钮让用户可以重新触发hire流程

### 1.2 转移岗位后页面不刷新
- 文件：`static/app.js` renderExpandInner → transfer按钮onclick
- 问题：transfer后调用renderContent()，但links数组是页面初始化时fetch的旧数据
- 修复：transfer成功后重新fetch `/api/pipeline/active` 更新links数组，再renderContent

### 1.3 简历初筛空值保存异常显示
- 文件：`static/app.js` renderPhoneScreenFormHTML → save逻辑
- 问题：conclusion为空字符串时后端接受，前端渲染出空白黄色tag
- 修复：保存前校验，conclusion为空时不提交（或提示用户选择结论）

### 1.4 清理InterviewRecord废弃引用
- 文件：`app/routes/pipeline.py` 第206行 transfer函数
- 问题：仍引用已废弃的InterviewRecord表
- 修复：删除transfer中的InterviewRecord迁移逻辑

---

## 第二批：产品简化 + 设计系统

### 2.1 删除phone_screen活动类型
- 后端：`app/routes/activities.py` CHAIN_TYPES删除phone_screen，STAGE_LABEL删除对应项
- 前端：删除所有renderPhoneScreenFormHTML、getPhoneScreenFormData、bindPhoneScreenFormInteractivity
- 前端：renderNextStep中删除phone_screen选项
- 数据迁移：已有phone_screen记录保留，但不再创建新的

### 2.2 删除Job.stages字段
- 后端：`app/models.py` Job表删除stages列
- 后端：`app/routes/jobs.py` 创建/更新接口不再处理stages
- 后端：`app/routes/pipeline.py` get_active_pipeline不再返回job_stages
- 前端：岗位创建/编辑表单删除stages配置区域
- 前端：进行中页不再依赖job_stages，流程阶段由活动链自动体现

### 2.3 删除Job.interview_rounds和CandidateJobLink.interview_rounds
- 后端：`app/models.py` 两个表删除interview_rounds列
- 后端：`app/routes/pipeline.py` 删除update_interview_rounds端点
- 前端：删除所有interview_rounds相关UI
- 面试轮次完全由实际activity链自动计数（nextInterviewRound函数已实现）

### 2.4 简历筛选补全筛选人
- 前端：进行中页展开后的简历筛选卡片，通过/淘汰按钮上方增加"筛选人"输入框
- 保存时写入ActivityRecord.actor

### 2.5 修复导入后跳转逻辑
- 前端：uploadAndConfirm保存成功后
  - 选了岗位 → `location.hash = '#/pipeline?expand={linkId}'`，进行中页解析参数自动展开
  - 没选岗位 → `location.hash = '#/talent'`，toast提示"已入库"
- 前端：进行中页renderPipelineTracking检查URL参数，自动展开对应行

### 2.6 删除弹窗多余按钮
- 前端：解析弹窗（modal-overlay）在解析模式下隐藏底部"保存候选人"按钮（modal-save），改为在modal-body内部渲染保存按钮
- 前端：删除导入表单中的"初始阶段"选择器（f-stage-block），永远从筛选开始

### 2.7 简化Next Step选项
- 简历筛选通过后：安排面试（默认展开）| 直接发Offer（文字链）
- 面试通过后：安排下一轮（默认展开）| 发Offer（文字链）
- Offer接受后：确认入职
- 每个节点最多2个选项

### 2.8 新增Supplier供应商表
- 后端：`app/models.py` 新增Supplier模型（id, name, type, contact_name, phone, email, notes）
- 后端：Candidate表新增supplier_id外键，保留source字段做兼容
- 后端：新增 `app/routes/suppliers.py`（CRUD）
- 前端：导入表单"来源渠道"从自由输入改为下拉选择（带"新增供应商"快捷入口）
- 前端：人才库增加按供应商筛选
- 数据迁移：已有source字符串尝试匹配到supplier，无法匹配的保留原值

### 2.9 建立CSS设计系统
- 新增CSS变量（语义色token）：
  ```
  --c-pass/--bg-pass, --c-reject/--bg-reject, --c-pending/--bg-pending
  --c-hired/--bg-hired, --c-scheduled/--bg-scheduled, --c-cancelled/--bg-cancelled
  --c-primary/--c-primary-hover, --c-text/--c-text-secondary/--c-text-muted
  --c-border, --c-bg, --c-surface
  --radius-sm/md/lg, --space-xs/sm/md/lg
  ```
- 新增语义class：
  ```
  .status-badge.pass / .reject / .pending / .hired / .scheduled / .cancelled
  .action-btn-group（操作按钮组）
  .form-inline（行内表单）
  .timeline-node（活动时间线节点）
  ```
- 消灭app.js中所有inline style，替换为class
- 统一6个弹窗为1个通用弹窗容器 + JS动态填充

### 2.10 交互布局优化
- 进行中页展开行重排：操作区在上 → 历史在下（折叠）→ 辅助操作在底部
- 简历筛选改为一行表单：`筛选人[___] [✓通过] [✗淘汰]`
- 面试安排：上一步通过后直接展开安排表单，备选项用文字链
- 淘汰原因弹窗统一：进行中页的reject-overlay和面试表单内的淘汰原因合并为同一套组件

---

## 第三批：新增能力

### 3.1 新增onboard活动类型（入职确认）
- 后端：CHAIN_TYPES新增"onboard"，STAGE_LABEL新增 onboard→"入职确认"
- ActivityRecord复用现有字段：start_date（入职日期）、comment（备注）
- 前端：新增renderOnboardFormHTML（入职日期+备注）
- 流程：Offer接受 → 下一步显示"确认入职" → 填入职日期 → 保存 → outcome="hired"

### 3.2 Offer阶段完善
- Offer结论保持：接受 / 拒绝 / 谈判中
- 接受后不再直接弹hire确认，而是进入onboard活动
- 拒绝后自动标记outcome="rejected"（原因：候选人拒绝Offer）

### 3.3 已入职页面
- 新增导航项"已入职"
- 数据源：CandidateJobLink.outcome="hired" 的记录
- 展示：候选人姓名、入职岗位、入职日期（从onboard activity取）、入职天数
- 支持搜索、按岗位筛选
- 人才库中已入职人员显示灰色标签，不可再推荐到岗位

---

## 第四批：技术债清理

### 4.1 前端模块化拆分
```
static/
  app.js              → 路由 + 初始化（~80行）
  lib/
    api.js            → fetch封装 + toast + withLoading
    helpers.js        → formatTime, validateForm
  components/
    activity-card.js  → 活动卡片渲染（所有类型共用）
    activity-form.js  → 面试表单/Offer表单/筛选表单/入职表单
    overlays.js       → 通用弹窗容器 + 各业务弹窗内容
    progress.js       → 进度点渲染
    upload.js         → 上传+解析+确认
  pages/
    dashboard.js      → 首页
    pipeline.js       → 进行中
    talent.js         → 人才库
    jobs.js           → 岗位库
    candidate.js      → 候选人详情
    analytics.js      → 数据分析
    onboarded.js      → 已入职
```
- 使用ES module `<script type="module">`，零构建工具
- 每个文件export自己的函数，import依赖

### 4.2 HTML弹窗DOM清理
- 删除index.html中6个独立弹窗DOM
- 改为1个通用弹窗容器，JS动态渲染内容
- overlays.js统一管理弹窗的打开/关闭/内容填充

### 4.3 废弃代码清理
- 删除InterviewRecord模型（已有interview_records_bak备份）
- 删除看板相关CSS（.kanban-*，已不使用）
- 删除stage_change相关渲染逻辑（已废弃）
- 删除advance button相关CSS（.pt-advance-*，已不使用）

---

## 执行顺序和依赖关系

```
第一批（修Bug）→ 无依赖，立即执行
     ↓
第二批（产品简化）→ 依赖第一批完成
  ├── 2.1-2.7 产品逻辑变更（串行）
  ├── 2.8 供应商（独立，可并行）
  └── 2.9-2.10 设计系统+交互优化（依赖2.1-2.7的UI变更完成后统一做）
     ↓
第三批（新增能力）→ 依赖第二批完成
  ├── 3.1-3.2 onboard + Offer完善（串行）
  └── 3.3 已入职页面（依赖3.1）
     ↓
第四批（技术债）→ 依赖第三批完成（所有功能稳定后再拆分）
  ├── 4.1 模块化拆分
  ├── 4.2 弹窗DOM清理
  └── 4.3 废弃代码清理
```

## 涉及文件清单

### 后端
- `app/models.py` — 删stages/interview_rounds列，新增Supplier模型，Candidate加supplier_id
- `app/routes/pipeline.py` — 删interview_rounds端点，清理InterviewRecord引用，transfer刷新
- `app/routes/activities.py` — 删phone_screen，加onboard，CHAIN_TYPES/STAGE_LABEL更新
- `app/routes/jobs.py` — 删stages处理
- `app/routes/suppliers.py` — 新增CRUD
- `app/routes/candidates.py` — 支持supplier_id筛选

### 前端
- `static/style.css` — CSS变量 + 语义class + 删除废弃样式
- `static/index.html` — 弹窗DOM收敛为1个，新增导航项"已入职"
- `static/app.js` → 最终拆分为 app.js + lib/ + components/ + pages/

### 数据库
- SQLite migration：删列（stages, interview_rounds×2），加表（suppliers），加列（candidate.supplier_id）
