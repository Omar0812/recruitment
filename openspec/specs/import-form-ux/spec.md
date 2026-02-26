## Purpose
定义简历导入弹窗的交互规范，包括教育/工作经历积木式编辑、岗位投递选项格式、AI 解析字段以及技能标签输入。

## Requirements

### Requirement: 导入弹窗积木式教育/工作经历编辑
导入弹窗 SHALL 以积木块形式展示教育经历和工作经历，AI 解析出几条就渲染几块，每块可删除，底部有「+ 添加」按钮新增空白块。不预设空白行。来源渠道 SHALL 从自由文本输入改为供应商下拉选择。

#### Scenario: AI 解析出多条经历
- **WHEN** AI 从简历中提取到 2 条教育经历和 3 条工作经历
- **THEN** 弹窗渲染 2 个教育积木块和 3 个工作积木块，每块填充对应数据

#### Scenario: 用户新增积木块
- **WHEN** 用户点击「+ 添加教育经历」
- **THEN** 在列表末尾追加一个空白教育积木块供填写

#### Scenario: 用户删除积木块
- **WHEN** 用户点击某积木块的删除按钮
- **THEN** 该块从列表中移除，其余块不受影响

#### Scenario: 来源渠道显示供应商下拉
- **WHEN** 导入弹窗加载
- **THEN** "来源渠道"字段显示为下拉选择器，选项从 `/api/suppliers` 加载，附带"新增供应商"按钮和"其他（手动输入）"选项

#### Scenario: 选择"其他"显示手动输入框
- **WHEN** 用户在来源下拉中选择"其他（手动输入）"
- **THEN** 下拉下方显示文本输入框，用户可手动填写来源

#### Scenario: 保存时写入 supplier_id
- **WHEN** 用户选择了某个供应商并保存候选人
- **THEN** 系统将 supplier_id 写入候选人记录，source 字段自动填充为供应商名称

### Requirement: 投递岗位选项显示格式
导入弹窗的岗位选择 SHALL 将「关联岗位」改名为「投递岗位」，选项格式为「岗位名 @编号」（如「前端工程师 @001」）。

#### Scenario: 岗位选项展示
- **WHEN** 弹窗加载岗位列表
- **THEN** 每个选项显示为「{title} @{id三位补零}」格式

### Requirement: AI prompt 提取全量经历
AI 简历解析 SHALL 返回 `education_list` 数组和 `work_experience` 数组，包含简历中所有可识别的经历条目。

#### Scenario: 多段经历提取
- **WHEN** 简历包含本科+硕士教育经历和两段工作经历
- **THEN** AI 返回 `education_list` 含 2 条，`work_experience` 含 2 条

### Requirement: 技能标签输入框
导入弹窗 SHALL 包含 `id="f-tags"` 的技能标签输入框，允许 HR 填写逗号分隔的技能标签，保存时解析为数组存入 `skill_tags`。

#### Scenario: 保存候选人时读取标签
- **WHEN** HR 在标签输入框中填写"Java, Spring, MySQL"并点击保存
- **THEN** 系统将 `["Java", "Spring", "MySQL"]` 作为 `skill_tags` 保存到候选人档案

#### Scenario: 标签输入框为空时
- **WHEN** HR 未填写标签输入框
- **THEN** 系统保存空数组 `[]` 作为 `skill_tags`，不报错

### Requirement: 导入保存后智能跳转
uploadAndConfirm 保存成功后 SHALL 根据是否选择了岗位执行不同跳转。

#### Scenario: 选了岗位后跳转进行中页
- **WHEN** 用户在导入表单中选择了岗位并保存成功
- **THEN** 系统跳转到 `#/pipeline?expand={linkId}`，进行中页自动展开该候选人行

#### Scenario: 没选岗位后跳转人才库
- **WHEN** 用户在导入表单中未选择岗位并保存成功
- **THEN** 系统跳转到 `#/talent`，显示 toast "已入库"

### Requirement: 解析弹窗隐藏多余保存按钮
解析模式下的弹窗 SHALL 隐藏底部固定的"保存候选人"按钮（modal-save），保存操作由 modal-body 内部的确认按钮触发。

#### Scenario: 解析模式下底部按钮隐藏
- **WHEN** 弹窗处于简历解析模式
- **THEN** 底部 modal-save 按钮不可见，用户通过表单内部的保存按钮提交

#### Scenario: 非解析模式下底部按钮正常
- **WHEN** 弹窗处于非解析模式（如手动编辑）
- **THEN** 底部 modal-save 按钮正常显示

## REMOVED Requirements

### Requirement: 导入表单初始阶段选择器
**Reason**: 流程永远从简历筛选开始，初始阶段选择器（f-stage-block）是多余的。
**Migration**: 删除 index.html 中 f-stage-block 元素和 app.js 中动态加载 stages 的逻辑。候选人入库后自动从 resume_review 开始。
