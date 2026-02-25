## 1. 数据库迁移

- [x] 1.1 ALTER TABLE candidates ADD COLUMN followup_status VARCHAR

## 2. 后端

- [x] 2.1 在 app/models.py 的 Candidate 模型新增 followup_status 字段
- [x] 2.2 更新 app/routes/candidates.py 的列表接口，支持按 followup_status 筛选
- [x] 2.3 更新 CandidateUpdate schema，支持更新 followup_status 字段

## 3. 前端：人才库页面

- [x] 3.1 导航栏新增"人才库"入口（`#/talent`）
- [x] 3.2 新增 renderTalentPool() 函数，展示全量候选人列表
- [x] 3.3 列表列：姓名、技能标签、跟进状态、关联岗位数、来源、操作
- [x] 3.4 筛选栏：跟进状态下拉、来源下拉、搜索框
- [x] 3.5 每行新增"推荐到岗位"按钮，复用 #link-job-overlay 弹窗

## 4. 前端：跟进状态

- [x] 4.1 人才库列表每行展示跟进状态标签（待跟进/已联系/暂不考虑/-）
- [x] 4.2 人才库列表支持内联修改跟进状态（select 下拉直接保存）
- [x] 4.3 候选人详情页基本信息区域新增跟进状态字段展示和编辑
