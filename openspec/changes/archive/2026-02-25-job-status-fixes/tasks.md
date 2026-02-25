## 1. 岗位库状态筛选联动修复

- [x] 1.1 在 `loadJobs()` 中，构建请求参数时判断 `status === "closed"`，若是则强制设置 `params.set("include_closed", "true")`
- [x] 1.2 验证：下拉选"已关闭" → 列表正确显示已关闭岗位
- [x] 1.3 验证：下拉选"招聘中" → 不受影响，复选框仍独立控制 include_closed

## 2. 候选人详情英文名去重

- [x] 2.1 在候选人详情 header 渲染处，将 `c.name && c.name_en` 条件改为 `c.name_en && c.name_en !== c.name`
- [x] 2.2 验证：中英文名相同时 header 只显示一次名字
- [x] 2.3 验证：中英文名不同时英文名正常显示
