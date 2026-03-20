# 人才库（Talent Pool）

> 候选人档案库，关注「人」而非「流程」。多维筛选 + 卡片列表 + 星标。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/candidates` | 候选人列表，分页 + 多维筛选 |
| PATCH | `/candidates/{id}/star` | 切换星标（toggle） |

**GET /candidates 查询参数**：
```
page, page_size (默认 20, 上限 100)
search           关键词（姓名/手机/邮箱模糊匹配，LIKE 通配符 % _ 自动转义）
source           来源渠道（数组，IN 匹配）
supplier_id      供应商 ID
tags             技能标签（逗号分隔，AND 匹配）
education        学历（精确匹配）
years_exp_min/max  工作年限区间
age_min/max      年龄区间
pipeline_status  流程状态：none / in_progress / ended
starred          布尔，只看星标
blacklist        only / exclude（默认全部）
```

**返回结构**：`{ items, total, page, page_size }`
- 每条 item 含 `candidate` 对象 + `latest_application`（最新流程摘要：job_title, state, stage, outcome, status_changed_at）
- latest_application 优先返回 IN_PROGRESS 状态的流程

## 页面

路由 `/talent-pool`，页面组件 `TalentPoolView.vue`

- **筛选器**（`TalentPoolFilters.vue`）：关键词搜索（300ms 防抖）+ 技能/来源/学历/年限/年龄/流程状态/星标/黑名单 筛选
- **候选人卡片列表**（`CandidateList.vue` → `CandidateCard.vue`）：分页，点击卡片打开候选人面板。卡片日期显示 `MM-DD`（调用 `utils/date.ts` 的 `formatShortDate`），入职日期显示 `MM-DD 入职`
- **星标**：卡片上直接 toggle，乐观更新（失败回滚 + toast）
- **来源选项**：从 source-tags + suppliers + 固定值「内推」聚合
- **技能选项**：从 `/candidates/skill-options` 获取
- **路由联动**：支持 `?pipeline_status=xxx` 参数（从其他页面跳转带入筛选）

## 业务规则

- **展示范围**：所有未删除（deleted_at IS NULL）且未被合并（merged_into IS NULL）的候选人
- **默认包含黑名单**：黑名单候选人默认显示（有标记），可通过筛选切换
- **排序**：建档时间倒序（created_at DESC）
- **技能标签 AND 匹配**：选多个技能标签时，候选人必须全部包含
- **流程状态筛选**：
  - `none`：无任何 Application
  - `in_progress`：至少有一个 IN_PROGRESS Application
  - `ended`：有 Application 但无 IN_PROGRESS 的
- **星标 toggle**：`PATCH /candidates/{id}/star`，starred 字段 0↔1 切换
- **面板变更刷新**：候选人面板内做了修改（candidatePanelMutationState.version 变化）时，自动重新加载列表

## 与其他模块的交互

- **候选人面板**：点击卡片 → 右侧滑入面板，可编辑档案、推荐到岗位、标记黑名单
- **新建候选人**：建档后不关联岗位时进入人才库
- **进行中**：面板内 [推荐到岗位] → 创建 Application → 跳转进行中页面
- **今日简报**：简报待办区可带 `?pipeline_status=in_progress` 跳转到人才库
- **渠道页**：来源渠道筛选选项包含 source-tags 和 suppliers 的名称
