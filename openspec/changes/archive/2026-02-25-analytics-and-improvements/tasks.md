## 1. 后端修复

- [x] 1.1 `candidates.py` `get_candidate` 补充 `deleted_at IS NULL` 过滤，软删除候选人返回 404
- [x] 1.2 `candidates.py` `patch_candidate` 修改信息后写入 HistoryEntry（"信息已更新"）
- [x] 1.3 `pipeline.py` `link_candidate` 将重复检查从"同岗位"扩展为"任意活跃 link"，错误信息包含当前岗位名

## 2. 前端基础设施

- [x] 2.1 `app.js` 顶部添加 `showToast(msg, type)` 函数（右上角 toast，2 秒消失）
- [x] 2.2 `app.js` 添加 `withLoading(btn, asyncFn)` 工具函数（执行期间 disable 按钮 + 文字改"保存中..."）
- [x] 2.3 `app.js` api helper 补充错误处理：非 2xx 响应时调用 `showToast` 显示错误信息
- [x] 2.4 `index.html` 导航栏新增"数据分析"链接（`href="#/analytics"`，`data-page="analytics"`）
- [x] 2.5 `app.js` router 新增 `#/analytics` 路由，映射到 `renderAnalytics`

## 3. 表单验证

- [x] 3.1 `app.js` 添加 `validateCandidateForm(fields)` 验证函数（手机11位数字、邮箱格式、年龄1-100、工作年限0-50）
- [x] 3.2 导入弹窗保存按钮（`modal-save`）调用验证函数，失败时阻止提交并 toast 提示
- [x] 3.3 候选人编辑弹窗保存按钮调用验证函数，失败时阻止提交并 toast 提示
- [x] 3.4 导入弹窗保存按钮改用 `withLoading` 防重复提交
- [x] 3.5 候选人编辑弹窗保存按钮改用 `withLoading` 防重复提交
- [x] 3.6 看板/流程跟进所有确认按钮改用 `withLoading` 防重复提交

## 4. 单活跃流程前端处理

- [x] 4.1 `renderCandidateProfile` 新增投递按钮捕获 400 错误，toast 显示后端返回的错误信息
- [x] 4.2 `renderTalentPool` 推荐到岗位按钮捕获 400 错误，toast 显示错误信息
- [x] 4.3 `renderPipeline` 看板内投递（如有）捕获 400 错误

## 5. 数据分析页面

- [x] 5.1 `app.js` 实现 `renderAnalytics(el)` 函数，页面骨架（标题 + 四个模块卡片）
- [x] 5.2 实现招聘漏斗模块：聚合所有活跃 links 按阶段分组，计算各阶段人数和转化率，纯 CSS 进度条展示
- [x] 5.3 实现岗位汇总模块：按岗位聚合投递总数/进行中/已淘汰/Offer，表格展示
- [x] 5.4 实现候选人来源分布模块：聚合所有候选人 source 字段，横向进度条展示占比
- [x] 5.5 实现淘汰原因分布模块：聚合所有 rejected links 的 rejection_reason，横向进度条展示占比

## 6. 验证

- [ ] 6.1 候选人已有活跃流程时投递新岗位 → 确认拦截并显示提示
- [ ] 6.2 访问已合并删除候选人详情页 → 确认显示"不存在"提示
- [ ] 6.3 编辑候选人信息 → 确认历史记录 tab 新增记录
- [ ] 6.4 断网后点击保存 → 确认显示 toast 错误提示
- [ ] 6.5 快速双击保存 → 确认只提交一次
- [ ] 6.6 填写错误手机号/邮箱 → 确认阻止提交并提示
- [ ] 6.7 数据分析页面 → 确认四个模块正常展示数据
