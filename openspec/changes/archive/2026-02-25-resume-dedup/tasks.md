## 1. 后端

- [x] 1.1 在 `app/routes/candidates.py` 新增 `POST /api/candidates/check-duplicate` 端点，接收 `name/phone/email/last_company`，按手机号、邮箱、姓名+上家公司三种规则查重，返回匹配候选人列表

## 2. 前端

- [x] 2.1 在 `uploadAndConfirm` 中，解析结果渲染完成后调用 `/api/candidates/check-duplicate`
- [x] 2.2 若返回匹配候选人，在弹窗顶部插入重复警告 banner，显示匹配候选人姓名、手机、邮箱、上家公司
- [x] 2.3 警告 banner 中添加"更新已有档案"按钮，点击后 PATCH 已有候选人（非空字段 + resume_path），跳转详情页
- [x] 2.4 警告 banner 中添加"仍然新建"按钮，点击后隐藏警告，恢复正常保存流程
- [x] 2.5 无重复时不显示警告，流程不变

## 3. 验证

- [x] 3.1 手机号重复时正确触发警告
- [x] 3.2 邮箱重复时正确触发警告
- [x] 3.3 姓名+上家公司重复时正确触发警告
- [x] 3.4 "更新已有档案"正确更新数据并跳转
- [x] 3.5 "仍然新建"正常创建新档案
- [x] 3.6 无重复时弹窗无警告
