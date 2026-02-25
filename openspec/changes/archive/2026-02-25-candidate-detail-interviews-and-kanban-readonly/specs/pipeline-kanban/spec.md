## MODIFIED Requirements

### Requirement: 看板卡片展示面试记录入口
看板卡片 SHALL 区分 active（进行中）和 inactive（已淘汰/已退出）两种状态。active 卡片保持现有完整交互；inactive 卡片 SHALL 只读灰化，不渲染移阶段下拉、备注按钮、淘汰按钮，仅保留候选人姓名链接和淘汰原因 tag。

#### Scenario: active 卡片正常展示
- **WHEN** 候选人在该岗位的 outcome 为空（进行中）
- **THEN** 看板卡片显示完整操作按钮（移至、备注、面试记录、淘汰）

#### Scenario: inactive 卡片只读
- **WHEN** 候选人在该岗位的 outcome 为 rejected 或 withdrawn
- **THEN** 看板卡片灰化显示，不渲染任何操作按钮，仅显示姓名链接和淘汰原因 tag

#### Scenario: 新增面试记录入口
- **WHEN** HR 点击"+ 新增面试记录"
- **THEN** 系统弹出面试记录填写表单

### Requirement: 看板列默认折叠已淘汰卡片
看板每列 SHALL 默认隐藏 inactive 卡片，并在列底部显示"显示已淘汰 (N)"toggle 按钮（N 为该列 inactive 卡片数量）。当该列无 inactive 卡片时不显示 toggle。

#### Scenario: 默认折叠已淘汰卡片
- **WHEN** HR 进入看板页面
- **THEN** 每列只显示 active 卡片，inactive 卡片默认隐藏

#### Scenario: 展开已淘汰卡片
- **WHEN** HR 点击"显示已淘汰 (N)"toggle
- **THEN** 该列的 inactive 卡片展开显示，toggle 文字变为"隐藏已淘汰"

#### Scenario: 无已淘汰卡片时不显示 toggle
- **WHEN** 某列所有候选人均为 active 状态
- **THEN** 该列底部不显示任何 toggle 按钮

### Requirement: 看板卡片备注弹窗预填和事件安全
看板卡片备注弹窗 SHALL 在打开时预填当前已有备注内容。弹窗确认按钮 SHALL 使用 `onclick` 赋值方式绑定事件，避免重复叠加监听器。

#### Scenario: 备注弹窗预填已有内容
- **WHEN** HR 点击看板卡片的备注按钮，且该候选人已有备注
- **THEN** 备注弹窗的文本框预填当前备注内容，HR 可在此基础上修改

#### Scenario: 弹窗按钮不重复触发
- **WHEN** HR 在同一看板页面多次操作（移阶段、备注、淘汰）后点击确认
- **THEN** 每次操作只触发一次 API 请求，不因事件叠加产生重复调用
