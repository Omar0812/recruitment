## REMOVED Requirements

### Requirement: 首页支持人视图和岗位视图切换
**Reason**: 人视图内容与"流程跟进"页面高度重叠，双 tab 增加认知负担，首页应聚焦快速概览。
**Migration**: 使用侧边栏导航进入"流程跟进"页面查看按阶段分组的活跃人选。

## ADDED Requirements

### Requirement: 首页单视图直接展示
系统 SHALL 在首页直接展示简历上传区、今日待跟进、岗位健康度、AI建议，无需 tab 切换。

#### Scenario: 进入首页
- **WHEN** HR 进入首页
- **THEN** 系统直接显示上传区、今日待跟进 card、岗位健康度 card、AI建议 card，无 tab 按钮
