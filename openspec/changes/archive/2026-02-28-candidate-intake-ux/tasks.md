## 1. 新建 CreateCandidateDialog 组件

- [x] 1.1 新建 `frontend/src/components/CreateCandidateDialog.vue`，包含 el-dialog 骨架、props（`modelValue`）、emit（`update:modelValue`, `created`）
- [x] 1.2 添加简历上传区：`el-upload` 设置 `:auto-upload="false"`，`onChange` 触发手动上传逻辑
- [x] 1.3 实现上传函数：调用 `POST /api/resume/upload`（multipart），上传中显示 loading 状态
- [x] 1.4 上传成功后：将 `parsed` 字段预填入表单（name/phone/email/last_title/last_company/education），保存 `resume_path`，自动展开手动填写区
- [x] 1.5 上传返回 `warning` 时：显示 `el-alert` 提示用户 AI 未配置或解析失败，仍展开表单
- [x] 1.6 添加手动填写区：默认折叠，点击折叠标题展开/收起，包含姓名（必填）/手机/邮箱/当前职位/当前公司/学历/备注字段
- [x] 1.7 实现「建立档案」按钮：校验姓名非空，调用 `POST /api/candidates`（携带所有表单字段 + resume_path），成功后 emit `created`、toast「候选人档案已创建」、关闭弹窗
- [x] 1.8 实现弹窗关闭重置：`@close` 清空所有表单字段、重置 resume_path、重置折叠状态、重置上传状态

## 2. Today 页接入

- [x] 2.1 在 `Today.vue` 中 import `CreateCandidateDialog`，注册组件，添加 `createDialogVisible` ref
- [x] 2.2 在 week-summary 区域（刷新按钮旁）加「新建候选人」`el-button`，`@click="createDialogVisible = true"`
- [x] 2.3 在模板中挂载 `<CreateCandidateDialog v-model="createDialogVisible" />`

## 3. Talent 页替换

- [x] 3.1 在 `Talent.vue` 中删除原有 `el-dialog`（简历上传 dialog）及相关模板代码
- [x] 3.2 删除 `uploadDialogVisible`、`openUpload`、`onUploadSuccess`、`onUploadError` 等相关 ref 和函数
- [x] 3.3 import `CreateCandidateDialog`，添加 `createDialogVisible` ref
- [x] 3.4 将 toolbar 中「导入简历」按钮改为「新建候选人」，`@click="createDialogVisible = true"`
- [x] 3.5 挂载 `<CreateCandidateDialog v-model="createDialogVisible" @created="fetchCandidates" />`

## 4. 验证

- [x] 4.1 验证：Today 页点击「新建候选人」弹窗正常打开/关闭
- [x] 4.2 验证：手动填写姓名后点击「建立档案」，候选人真实入库，人才库列表可见
- [x] 4.3 验证：上传简历后 AI 解析字段自动预填，编辑后确认，候选人入库且 resume_path 关联正确
- [x] 4.4 验证：姓名为空时提交被阻止，显示校验错误
- [x] 4.5 验证：关闭弹窗后再次打开，表单为空白状态
- [x] 4.6 验证：Talent 页旧版上传弹窗代码已清除，新版「新建候选人」按钮正常工作
