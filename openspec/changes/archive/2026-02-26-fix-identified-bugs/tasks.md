## 1. 后端 candidates.py

- [x] 1.1 删除 `check_duplicate` 函数 return 后的死代码（第142-143行）
- [x] 1.2 `PATCH /api/candidates/{id}` 查询加 `deleted_at.is_(None)` 过滤
- [x] 1.3 `GET /api/candidates` 搜索的 `or_()` 中追加 `Candidate.name_en.ilike(f"%{q}%")`
- [x] 1.4 `get_candidate` 返回的 `job_links` 每条记录补充 `job_stages` 字段

## 2. 后端 jobs.py

- [x] 2.1 `list_jobs` 的 `active_links` 列表推导式加 `lnk.candidate and lnk.candidate.deleted_at is None` 过滤

## 3. 前端 app.js — api helper

- [x] 3.1 在 `api` 对象中补充 `delete` 方法（与 patch 风格一致，失败时 showToast）

## 4. 前端 app.js — 候选人详情

- [x] 4.1 下载简历 `href` 改为手动拼接路径，去掉 `encodeURIComponent` 对整段路径的编码
- [x] 4.2 流程 tab 阶段列表改用 `activeLink.job_stages`，fallback 到默认阶段
- [x] 4.3 备注保存改用 `showToast("备注已保存", "success")` 替代 `alert()`

## 5. 前端 app.js — 人才库

- [x] 5.1 候选人名渲染改为 `c.name || c.name_en || "?"`

## 6. 前端 app.js — 流程跟进

- [x] 6.1 删除面试记录改用 `api.delete`
- [x] 6.2 删除 `renderExpandInner` 中错误的重绑定死代码（第1200-1201行）
- [x] 6.3 流程跟进"填写面评"弹窗打开时重置星星和结论按钮视觉状态

## 7. 前端 app.js — 岗位表单

- [x] 7.1 岗位表单保存按钮加 `withLoading` 包裹防重复提交
