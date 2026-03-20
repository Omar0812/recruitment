## 1. 后端：utc_now() 统一 aware

- [x] 1.1 修改 `app/utils/time.py` 的 `utc_now()`：去掉 `.replace(tzinfo=None)`，docstring 改为"返回 aware UTC datetime"
- [x] 1.2 修改 `app/utils/time.py` 的 `biz_day_bounds_utc_naive`：重命名为 `biz_day_bounds_utc`，参数名 `reference_utc_naive` → `reference_utc`，返回值去掉 4 处 `.replace(tzinfo=None)`
- [x] 1.3 修改 `app/utils/time.py` 的 `biz_week_start_utc_naive`：重命名为 `biz_week_start_utc`，参数名同上，返回值去掉 `.replace(tzinfo=None)`
- [x] 1.4 修改 `app/entry/deps.py` 第 47 行：删除 `expires = token_record.expires_at.replace(tzinfo=None) if token_record.expires_at.tzinfo else token_record.expires_at`，改为 `expires = token_record.expires_at`（直接比较 aware datetime）

## 2. 后端：引擎层消除重复 _now()

- [x] 2.1 修改 `app/engine/actions/application_lifecycle.py`：删除 `_now()` 定义（第 14-15 行），添加 `from app.utils.time import utc_now`，全文 `_now()` 替换为 `utc_now()`
- [x] 2.2 修改 `app/engine/actions/event_record.py`：同上，删除 `_now()` 定义，替换为 `utc_now()`
- [x] 2.3 修改 `app/engine/actions/application_advance.py`：同上，删除 `_now()` 定义，替换为 `utc_now()`

## 3. 后端：全局排查确认兼容性

- [x] 3.1 搜索全项目 `utc_now` 所有 import 和调用点，确认无 naive vs aware 比较
- [x] 3.2 搜索全项目 `.replace(tzinfo=None)`，确认无残留的 naive 转换代码
- [x] 3.3 搜索全项目 `datetime.now(timezone.utc)`（非 `utc_now` 调用），确认引擎层已全部替换，`legacy.py` 的 `_utc_now()` 和 `base.py` 的 `TimestampMixin` lambda 保持不动（它们已经是 aware）

## 4. 前端：创建 utils/date.ts

- [x] 4.1 新建 `frontend/src/utils/date.ts`，实现 5 个函数：`formatDateTime`（YYYY-MM-DD HH:mm）、`formatDate`（YYYY-MM-DD）、`formatShortDate`（MM-DD）、`formatTime`（HH:mm）、`formatDateWithWeekday`（YYYY-MM-DD 周几）
- [x] 4.2 所有函数处理 null/undefined 输入返回空字符串 `''`

## 5. 前端：Pipeline 模块组件替换

- [x] 5.1 `EventCard.vue`：删除 `formattedTime` computed 中的手搓逻辑（第 168-174 行），改为调用 `formatDateTime`
- [x] 5.2 `EventCard.vue`：删除面试安排摘要中的手搓 `M/D HH:mm`（第 185-188 行），改为调用 `formatDateTime`
- [x] 5.3 `PipelineRow.vue`：删除面试时间的手搓 `HH:mm` + `MM-DD`（第 62-64 行附近），非今天/明天的日期改为调用 `formatDateTime`

## 6. 前端：Briefing 模块组件替换

- [x] 6.1 `BriefingSchedule.vue`：删除 `formatTime` 函数（第 92-95 行），改为 import 调用 `utils/date.ts` 的 `formatTime`
- [x] 6.2 `BriefingView.vue`：删除 `formattedDate` computed 中的手搓逻辑（第 44-52 行），改为调用 `formatDateWithWeekday`

## 7. 前端：其他模块组件替换

- [x] 7.1 `HiredView.vue`：删除 `formatDate` 函数（第 58-65 行），改为调用 `formatDate` + `' 入职'` 后缀
- [x] 7.2 `BasicInfoTab.vue`（job-panel）：删除 `formatDate` 函数（第 68-72 行），改为 import 调用 `formatDate`
- [x] 7.3 `ResumeTab.vue`：删除 `formatDate` 函数（第 150-154 行），改为 import 调用 `formatDate`
- [x] 7.4 `CandidatePanel.vue`：删除担保期到期日的手搓格式化（第 266 行），改为调用 `formatDate`
- [x] 7.5 `ApplicationRecord.vue`：删除 `formatDate` 函数（第 111-114 行），改为 import 调用 `formatShortDate`
- [x] 7.6 `JobCard.vue`：删除 `formatDate` 函数（第 122-125 行），改为 import 调用 `formatShortDate`
- [x] 7.7 `CandidateCard.vue`：删除 `formatMonthDay` 函数（第 61-68 行），改为 import 调用 `formatShortDate`；入职日期拼接改为 `formatShortDate` + `'入职'`

## 8. 文档收尾

- [x] 8.1 更新 `docs/standards.md`：删除 ⚠️ 计划变更标记，将变更内容转为正式约定
- [x] 8.2 更新 6 个模块 contract：删除 ⚠️ 计划变更标记，将变更内容转为正式描述
- [x] 8.3 更新 `docs/bugfix-施工指南.md`：批次 4 状态改为 ✅ 已完成
- [x] 8.4 更新 `docs/实际运行问题收集.md`：#8 标记已修复
