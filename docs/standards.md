# Standards

> 跨版本有效的设计规则与技术约定。施工前必读。

---

## 一、设计规范

### 1. 设计立场

**核心隐喻——枯山水**：地无色，山有色。

- 地（容器/背景/结构）保持克制与近乎无色
- 山（有意义的信息）允许低饱和材质色
- 紧急信息允许唯一高对比强调色（砖红）

**体感目标**：

- 界面是容器，信息是主角
- 有秩序但不僵硬，有温度但不甜
- 高密度信息下仍保持呼吸感

### 2. 色彩系统

**核心色板（Tokens）**

| Token | 值 | 用途 |
|-------|------|------|
| `--color-bg` | `#FAFAF9` | 页面底色（暖白） |
| `--color-text-primary` | `#1A1A18` | 主文字 |
| `--color-text-secondary` | `rgba(26,26,24,0.60)` | 次文字 |
| `--color-line` | `rgba(26,26,24,0.12)` | 结构线/分割线 |
| `--color-urgent` | `#C4472A` | 仅紧急 |

**材质色（低饱和）**

| Token | 值 | 名称 |
|-------|------|------|
| `--color-material-moss` | `#6F7A69` | 苔绿 |
| `--color-material-stone` | `#6E7682` | 石蓝灰 |
| `--color-material-clay` | `#9A7E66` | 黏土棕 |

**使用规则**

- 每屏配色预算：中性色 ~88%、材质色 ~10%、砖红 ~2%
- 每屏除砖红外，仅允许 1 种材质色作为主色
- 禁止：多彩状态标签、大面积彩色卡片、彩色图标常态化

### 3. 字体与排版

**字体栈**

- 中文：`PingFang SC`
- 英文/数字：`Inter`
- 等宽（时间戳/ID）：`JetBrains Mono`

**字重（仅三档）**

| 字重 | 用途 |
|------|------|
| `500` | 标题/关键强调 |
| `400` | 正文主信息 |
| `300` | 辅助信息 |

规则：不依赖颜色做层级，不用 700 制造喊叫感。

**字号基线**

| 场景 | 字号 / 字重 |
|------|-------------|
| 页面标题 | 24 / 500 |
| 区块标题 | 18 / 500 |
| 列表主信息 | 15 / 400 |
| 列表次信息 | 13 / 300 |
| 标签/辅助 | 12 / 300 |

### 4. 空间与结构

**间距体系**：4px 基础网格 — `4 / 8 / 12 / 16 / 24 / 32 / 48`

**结构原则**

- **横线为主（默认）**：列表、表格、时间线、分组流
  - 线宽 1px，颜色 `--color-line`
  - 优先横向分割，减少纵向切割
- **框为例外（仅独立对象）**：档案卡、弹窗/抽屉容器、Composer 输入区
  - 1px 边框，无阴影，小圆角或直角（禁大圆角）

### 5. 组件语言

**按钮**

- 主按钮：实心深色 + 浅色文字
- 次按钮：透明底 + 1px 深色边框
- 危险按钮：仅破坏性操作使用砖红

**输入**

- 默认：底线或细边框
- Focus：边界增强（加深/加粗），禁止蓝色发光 focus ring

**状态表达**

- 位置 = 状态，文案 = 含义
- 优先通过分组和上下文表达，不依赖彩色标签
- 紧急/超时例外：砖红 + ⚠

**图标**

- 填充图标（克制版），单色填充（暖黑系）
- 常态透明度 ~70%，hover 100%
- 常规尺寸 14/16，紧急允许砖红

### 6. 动效语法

| 场景 | 动效 |
|------|------|
| 同层信息增加 | 向下展开（Accordion） |
| 进入子任务/详情 | 右侧滑出（Drawer） |
| 高风险确认 | 中间弹出（Modal） |
| 页面级跳转 | 无转场（直切） |

- 交互反馈 ~150ms，快、克制
- 禁止弹跳、过度 easing、花哨滑入

### 7. 设计验收清单

每次 UI 评审检查：

1. 符合"地无色，山有色"？
2. 仅紧急时使用砖红？
3. 默认横线分割，避免不必要的框？
4. 依靠字重而非颜色表达层级？
5. 避免多彩标签与过度动效？
6. 高密度下保持呼吸感？

---

## 二、技术规范

### 1. 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + TypeScript + Vite, Vue Router, Pinia |
| 组件 | 无头组件 + CSS Variables（Design Tokens） |
| 后端 | Python + FastAPI + Pydantic v2 |
| ORM | SQLAlchemy 2.x + Alembic |
| 数据库 | SQLite（WAL 模式），不用专有语法，保持 Postgres 可迁移 |
| AI 工具 | 统一 Provider Adapter（可插拔：Anthropic / OpenAI / Google / 本地模型） |

### 2. 后端约定

**分层规则**

| 层 | 职责 | 硬约束 |
|----|------|--------|
| `entry/api/` | HTTP 路由，校验、编排、错误翻译 | 不写业务逻辑 |
| `engine/` | 动作引擎，唯一写入口 | 不 import FastAPI，抛 BusinessError |
| `query/` | 查询服务 | 纯读，不写数据 |
| `ai/` | AI 工具层 | 不访问数据库 |
| `models/` | SQLAlchemy 模型 | 纯数据定义 + 关系映射，不含业务逻辑 |
| `schemas/` | Pydantic 输入输出 | 不 import models，通过 from_attributes 桥接 |

**命名约定**

- 路由文件按实体分（`candidates.py`, `jobs.py` …）
- Pydantic schema：`XxxCreate` / `XxxUpdate` / `XxxRead`
- 数据库字段 `snake_case`
- 时间：DB 存 UTC aware → API 传 ISO8601 `Z` 后缀 → 前端展示 Asia/Shanghai（见下方时间处理）
- 配置只由 entry 和 ai 层读取

**时间处理（后端）**

- 统一使用 `utc_now()`（`app/utils/time.py`）获取当前时间，返回 **aware** UTC datetime（`datetime.now(timezone.utc)`）
- 禁止直接调用 `datetime.utcnow()`（已 deprecated）或 `datetime.now()`
- 模型默认值和 onupdate 统一用 `utc_now`
- 序列化用 `serialize_timestamp_fields()` 递归转 ISO8601 `Z` 格式
- 业务日期判断（如简报的"今天/明天"）使用 `BIZ_TZ`（UTC+8）

**时间处理（前端）**

- 公共工具 `frontend/src/utils/date.ts` 统一日期格式化出口，各组件不再各自手搓
- 所有 UTC 时间戳展示前先转为 Asia/Shanghai（`new Date()` 在本地时区自动处理，但格式化逻辑统一收口）
- 三档格式规范：

| 格式函数 | 输出 | 适用场景 |
|----------|------|---------|
| `formatDateTime(iso)` | `YYYY-MM-DD HH:mm` | 事件时间线、面试安排、候选人面板流程记录 |
| `formatDate(iso)` | `YYYY-MM-DD` | 入职日期、目标到岗日期、简历创建日期、岗位创建日期 |
| `formatShortDate(iso)` | `MM-DD` | 卡片辅助信息（人才库、岗位卡片等空间紧张处） |

- 特殊场景：简报日程只显示 `HH:mm`（`formatTime`）；简报页头显示 `YYYY-MM-DD 周几`
- 禁止在组件内直接拼接日期字符串，统一调用 `utils/date.ts`

**认证与权限**

- 写操作的 actor_id 从 token 确定（`Depends(current_user)`），不信任客户端传入
- 需要登录的接口加 `Depends(current_user)`，需要管理员的接口加 `Depends(require_admin)`
- 公开接口（不需要认证）：login / register / check-login-name / has-users / 静态文件
- 前端两条 HTTP 路径（client.ts + files.ts）都带 Authorization header + 401 拦截

**乐观锁**

- 所有可编辑表带 `version` 字段（Integer, default=1）
- 写操作比对 version，不一致返回 409 `{code: "VERSION_CONFLICT", message: "该记录刚被修改过，请刷新"}`
- update 类写操作强制要求客户端传 version，缺失时返回 422 `"缺少 version 字段"`。CREATE 和 DELETE 操作不受影响
- 新增表默认加 version 字段

**密码哈希**

- 使用 `bcrypt` 库直接调用（`bcrypt.hashpw` / `bcrypt.checkpw`），不用 passlib

**业务异常**

- `BusinessError(code, message)` — code 机器读，message 人读
- entry 层统一捕获 → HTTP 422 + `{code, message}`

### 3. API 约定

- 统一前缀：`/api/v1`
- 写操作：`POST /api/v1/actions/execute`（唯一写入口）
- 读操作：资源接口 `GET` + 查询接口 `GET`
- 幂等：所有写请求必带 `command_id`
- 错误体：`{ code, message }`
- 时间：ISO8601 带时区
- 分页：`page` + `page_size`，默认 1 / 20

### 4. 前端约定

- 组件按功能拆目录
- CSS Variables 对齐 design tokens
- 无头组件优先
- HTTP 客户端使用 fetch 封装
- 状态管理使用 Pinia

### 5. 数据层约定

- 核心业务实体不硬删除，以状态流转表达生命周期
- Alembic 为唯一 schema 变更入口
- JSON 字段仅用于可扩展 payload，不承载关系主键
- 避免 SQLite 专有语法（PRAGMA / AUTOINCREMENT）

### 6. 技术验收清单

施工完成时检查：

1. API URL 命名与现有风格一致？
2. 数据库字段命名 `snake_case`？
3. 新增枚举值前后端完全对齐？
4. Pydantic schema 命名遵循约定？
5. 写操作走动作引擎，不绕过？
6. 时间用 `utc_now()`，不直接调 `datetime.utcnow()` 或 `datetime.now()`？
7. 新增可编辑表带 version 乐观锁？
8. 写操作注入 actor_id（从 current_user 取，不信任客户端）？
9. 需要认证的接口加了 `Depends(current_user)` 或 `Depends(require_admin)`？
