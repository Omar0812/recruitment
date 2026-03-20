# Changelog

所有版本更新记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/)。

## [1.8.2] — 2026-03-20

> 多用户系统上线 + 全面修复 + PDF 解析优化

### Added
- 多用户认证系统（登录/注销、Token 哈希存储、乐观锁）
- AI 配置从代码迁移到数据库，支持管理员后台配置
- 简历解析升级（AI 结构化提取增强）
- PDF 文本提取改用 LiteParse（文本优先 + 截图 fallback）

### Fixed
- 7 批 bugfix，修复 18 个问题（显示、数据、时间、安全、性能、前端交互）
- 面评/背调结论中文映射
- 简报时区统一 BIZ_TZ
- Token 哈希存储（安全加固）
- 乐观锁强制检查
- EventCard 编辑体验（菜单常显、评分4档、时间30分钟档）
- DOCX 预览修复
- 并发上传 + 按需解析

### Changed
- 时间处理统一（UTC aware datetime）
- bcrypt 直接调用，弃用 passlib

---

## [1.7.2] — 2026-03-17

> 部署体验优化

### Added
- 一键安装脚本（docker-run 方式）
- 卸载脚本
- config.json 容器内自动创建

### Fixed
- 统一 docker-run 安装流程，删除旧 install 脚本

---

## [1.7.0] — 2026-03-17

> 批量建档 bug 修复

### Fixed
- 修复批量建档时 AI 解析卡死事件循环（BUG-001）

---

## [1.6.0] — 2026-03-13

> Docker 容器化部署

### Added
- Dockerfile + docker-compose.yml，容器化部署
- 离线 wheels 安装

### Removed
- 旧启动脚本（改用 Docker）

---

## [1.5.0] — 2026-03-12

> 分发准备 + 流程交互打磨

### Changed
- 开箱即用分发准备（清理开发文件）
- EventCard 从卡片式重构为 timeline 单行格式
- StageAction 多按钮状态感知重构
- guard 收紧 + 5 项前端交互修复

---

## [1.4.0] — 2026-03-11

> UI 对齐 + 简历预览修复

### Fixed
- 6 项 UI 对齐 spec 修复
- Word 预览降级处理
- 推荐到岗位 action_code 修正

---

## [1.3.0] — 2026-03-10

> Offer 表单 + 渠道费用 + 多附件

### Added
- Offer 表单结构化薪资字段 + 自动计算
- 渠道面板猎头费聚合展示
- 简历 tab 多附件上传/预览/删除

### Fixed
- REJECTED/WITHDRAWN 原因列表对齐 spec
- 面试过期警告标记

---

## [1.2.0] — 2026-03-09

> 审计修复（12 项）

### Added
- 岗位编辑 + 关闭撤回
- 候选人面板操作增强（解除黑名单、编辑、推荐跳转）
- 猎头费贯穿 Offer 表单 + 事件卡片
- 进行中页面分组视图
- toast 5秒撤回 composable

### Fixed
- 10 处前端显示格式修复
- 9 处前端交互修复
- 4 个表单字段补全
- 面评/背调自动结束流程

---

## [1.1.0] — 2026-03-05

> 全面审阅修复（20+ 轮）

### Fixed
- 13 轮 review 修复（错误态、类型安全、流程闭环、筛选联动等）
- 7 轮 r2 修复（姓名展示、岗位打磨、已入职排序、分析跳转等）
- 简历 AI 解析预填 + 年月选择器
- iframe 简历预览 + DOC 转 PDF

---

## [1.0.0] — 2026-02-28

> v1.0 正式版：数据模型重建 + 全新前端

### Added
- 9 表数据模型（Event 驱动）+ 动作引擎 12 原语
- 全新 Vue 3 前端（9 个页面模块）
- REST API 入口层 + 查询服务层
- Alembic 数据库迁移
- 文档体系（宪法、标准、系统地图、11 个模块契约）

### Changed
- 从 Vue 2 迁移到 Vue 3 + TypeScript + Pinia
- 后端 service layer 重构 + Pydantic schemas

---

## [0.1.0] — 2026-02-15

> MVP 初始版本

### Added
- 岗位管理（CRUD、搜索、筛选）
- 看板式流程跟进
- 候选人管理（建档、查重、合并）
- 人才库 + 星标
- 简历上传与 AI 解析
- 数据分析页面
- 供应商/猎头管理
