## ADDED Requirements

### Requirement: 统一候选人创建弹窗组件
`frontend/src/components/CreateCandidateDialog.vue` SHALL 提供统一的候选人创建弹窗，支持「上传简历 + AI 预填」和「手动填写」两种路径，两者共用同一张确认表单。

#### Scenario: 弹窗默认状态
- **WHEN** 用户打开「新建候选人」弹窗
- **THEN** 显示简历上传区（`el-upload` 拖拽区）作为主视觉，手动填写区默认折叠，显示折叠标题「手动填写基础信息 [∨]」

#### Scenario: 用户点击展开手动填写区
- **WHEN** 用户点击折叠标题「手动填写基础信息」
- **THEN** 展开表单，显示姓名/手机/邮箱/当前职位/当前公司/学历/备注字段

#### Scenario: 上传简历后 AI 自动预填
- **WHEN** 用户上传简历文件，`/api/resume/upload` 返回 `parsed` 对象
- **THEN** 手动填写区自动展开，将 `parsed.name`/`parsed.phone`/`parsed.email`/`parsed.last_title`/`parsed.last_company`/`parsed.education` 预填入对应字段，`resume_path` 存入组件状态

#### Scenario: AI 解析有 warning 时提示用户
- **WHEN** `/api/resume/upload` 返回 `warning` 字段非空（AI 未配置或解析失败）
- **THEN** 显示 warning 内容提示用户，表单仍展开供手动填写

#### Scenario: 用户点击「建立档案」成功
- **WHEN** 用户填写姓名（必填）后点击「建立档案」
- **THEN** 调用 `POST /api/candidates`（携带表单字段 + `resume_path` 如有），成功后关闭弹窗，emit `created` 事件，显示 toast「候选人档案已创建」

#### Scenario: 姓名为空时阻止提交
- **WHEN** 用户未填写姓名直接点击「建立档案」
- **THEN** 显示校验错误「姓名不能为空」，不发起请求

#### Scenario: 弹窗关闭后重置状态
- **WHEN** 用户点击取消或弹窗关闭
- **THEN** 表单字段清空，上传状态重置，折叠区恢复折叠状态

### Requirement: 上传使用手动 axios 调用
弹窗 SHALL 使用 `el-upload` 的 `:auto-upload="false"` 模式，在 `onChange` 回调中手动调用 `/api/resume/upload`，拿到响应后预填表单，而不依赖 `action` 属性的自动上传。

#### Scenario: 文件选择后手动触发上传
- **WHEN** 用户选择或拖拽一个简历文件
- **THEN** 组件显示上传中状态，调用 `POST /api/resume/upload`，完成后预填字段并展开表单
