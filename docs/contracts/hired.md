# 已入职（Hired）

> 轻量只读列表，展示所有已入职候选人。HR 系统交接点。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/hired` | 已入职列表，分页（page, page_size），默认 page_size=20 |

**返回结构**：`{ items, total, page, page_size }`

每条 item 字段：
```
application_id, candidate_id, candidate_name,
job_id, job_title,
onboard_date,            ← 从最新 OFFER_RECORDED event payload 读取
monthly_salary,          ← payload.cash_monthly 或 payload.monthly_salary
salary_months,           ← payload.months 或 payload.salary_months
total_cash,              ← payload.total_cash，缺失时自动计算 monthly × months
source, supplier_id
```

## 页面

路由 `/hired`，页面组件 `HiredView.vue`

- 表格布局，列：姓名 · 岗位 · 入职日期 · 薪资 · 年总包
- 薪资格式：`Nk×M`（如 `33k×13`）
- 年总包格式：`总包Nk`（如 `总包429k`）
- 入职日期格式：`YYYY-MM-DD 入职`（调用 `utils/date.ts` 的 `formatDate`）
- 空列表显示「暂无已入职人员」
- 底部显示总人数
- 点击行 → 打开候选人详情面板

## 业务规则

- **数据来源**：仅展示 `Application.state = HIRED` 的记录
- **排序**：入职日期倒序（最新在前）；无入职日期的排末尾；同日期按 application_id 倒序
- **薪资读取优先级**：取最新 OFFER_RECORDED Event 的 payload，字段名兼容两种写法（cash_monthly/monthly_salary, months/salary_months）
- **total_cash 自动计算**：若 payload 无 total_cash 但有 monthly_salary 和 salary_months，自动相乘
- **无编辑能力**：此页面纯只读，不能修改薪资或入职日期（须回溯到进行中模块的 Event 修改）

## 与其他模块的交互

- **进行中**：候选人经 hire_confirmed 动作后 Application 变为 HIRED 状态，出现在本列表
- **候选人面板**：点击行打开面板，可查看完整流程记录，可在面板内 [标记离职]（record_left 动作）
- **数据分析**：渠道分析统计各渠道的 hired_count，数据与本列表同源

## ⚠️ spec 与代码差异

- **薪资数据源**：spec 写「从 offer_recorded / hire_confirmed Event payload 读取」，代码只读 OFFER_RECORDED，不读 HIRE_CONFIRMED
- **前端二次排序**：后端已按 onboard_date DESC 排序返回，前端 useHired.ts 又做了一次相同逻辑的排序（冗余但无害）
