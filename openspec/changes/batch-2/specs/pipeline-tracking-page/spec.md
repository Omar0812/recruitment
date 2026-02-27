## MODIFIED Requirements

### Requirement: Offer 接受后 Next Step 改为 onboard 流程
Offer 接受后的 Next Step SHALL 显示「确认入职」表单（创建 onboard 活动），不再直接弹出 hire 确认弹窗。

#### Scenario: Offer 接受后的 Next Step
- **WHEN** offer conclusion=接受 且 outcome 仍为 null
- **THEN** 显示「确认入职」区域，内含入职日期输入框 + 备注输入框 + 确认按钮

#### Scenario: 确认入职完成
- **WHEN** 用户填写入职日期并点击确认
- **THEN** 创建 onboard 活动（自动 outcome=hired），候选人从进行中列表移除

## ADDED Requirements

### Requirement: 展开区按活动状态动态渲染（状态A — 面试未到时间）
当 tail 活动为 `type='interview'`、`status='scheduled'`、且 `scheduled_at > now` 时，展开区 SHALL 只显示面试信息和「取消面试」按钮，不显示面评表单。

#### Scenario: 面试未到时间的展开区
- **WHEN** tail 是未来的已安排面试
- **THEN** 显示面试时间/面试官/地点，提供「取消面试」按钮，无面评表单

---

### Requirement: 展开区按活动状态动态渲染（状态B — 面试时间已过自动展开面评）
当 tail 活动为 `type='interview'`、`status='scheduled'`、且 `scheduled_at <= now` 时，展开区 SHALL 自动展开面评表单，无需用户点击按钮。表单字段顺序：面试官 → 面评文字 → 评分 → 结论。

#### Scenario: 面试时间已过自动展开面评表单
- **WHEN** tail 是 scheduled_at 已过的面试（status 仍为 scheduled）
- **THEN** 面评表单自动展开，用户直接填写，无需点击按钮

#### Scenario: 面评表单字段顺序
- **WHEN** 面评表单展开
- **THEN** 字段从上到下依次为：面试官输入框、面评文字框（主角，高度较大）、五星评分、结论按钮组（通过/待定/淘汰）

---

### Requirement: 展开区按活动状态动态渲染（状态C — 活动完成显示下一步节点选项）
当 tail 活动已完成（有 conclusion 或 status='completed'）时，展开区 SHALL 在当前活动卡片下方独立一行显示可用的下一步节点按钮，按当前阶段过滤。

#### Scenario: 一面完成后显示下一步选项
- **WHEN** tail 是已完成的面试
- **THEN** 独立一行显示：[安排面试] [发 Offer] [安排背调]

#### Scenario: Offer 接受后显示下一步选项
- **WHEN** tail 是 conclusion=接受 的 Offer
- **THEN** 显示：[安排背调] [确认入职]

#### Scenario: 背调完成后显示下一步选项
- **WHEN** tail 是已完成的背调
- **THEN** 显示：[确认入职]

#### Scenario: 点击下一步节点后内联展开表单
- **WHEN** 用户点击某个下一步节点按钮（如「安排面试」）
- **THEN** 在展开区内内联显示对应的新建表单，不弹窗

---

### Requirement: 底部操作栏始终可见且支持内联展开
展开区底部 SHALL 始终显示 [备注] [退出] [淘汰] 三个次要操作。点击任一操作，在底部操作栏上方内联展开对应表单，同时其他两个操作收起。

#### Scenario: 底部操作栏始终可见
- **WHEN** 展开区处于任何状态
- **THEN** 底部始终显示三个次要操作按钮，小字灰色，不抢眼

#### Scenario: 点击「备注」内联展开
- **WHEN** 用户点击「备注」
- **THEN** 在操作栏上方展开备注文本框 + 取消/保存按钮

#### Scenario: 点击「淘汰」内联展开
- **WHEN** 用户点击「淘汰」
- **THEN** 在操作栏上方展开淘汰原因选择（预设选项）+ 补充说明 + 取消/确认淘汰按钮

#### Scenario: 同时只有一个内联表单展开
- **WHEN** 用户点击「淘汰」时「备注」表单已展开
- **THEN** 「备注」表单收起，「淘汰」表单展开

## REMOVED Requirements

### Requirement: offer 接受后显示确认入职按钮
**Reason**: 替换为 onboard 活动流程。不再使用简单的确认按钮+hire弹窗，改为填写入职日期的 onboard 表单。
**Migration**: Next Step 中的「确认入职」按钮替换为 onboard 表单内联渲染。

### Requirement: 独立的「安排下一步」大按钮
**Reason**: 替换为状态感知的下一步节点选项行，按当前阶段过滤可用操作，更符合用户心智模型。
**Migration**: 删除现有「安排下一步」或「➕」通用按钮，改为状态C 下的具体节点选项行。
