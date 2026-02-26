## MODIFIED Requirements

### Requirement: 导入弹窗积木式教育/工作经历编辑
导入弹窗 SHALL 以积木块形式展示教育经历和工作经历，AI 解析出几条就渲染几块，每块可删除，底部有「+ 添加」按钮新增空白块。不预设空白行。

#### Scenario: AI 解析出多条经历
- **WHEN** AI 从简历中提取到 2 条教育经历和 3 条工作经历
- **THEN** 弹窗渲染 2 个教育积木块和 3 个工作积木块，每块填充对应数据

#### Scenario: 用户新增积木块
- **WHEN** 用户点击「+ 添加教育经历」
- **THEN** 在列表末尾追加一个空白教育积木块供填写

#### Scenario: 用户删除积木块
- **WHEN** 用户点击某积木块的删除按钮
- **THEN** 该块从列表中移除，其余块不受影响

## ADDED Requirements

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
