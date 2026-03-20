# 认证与用户管理
> 横切基础设施层。所有页面需登录，所有写操作记录操作者。

## 数据模型

**新增表**

| 表 | 核心字段 | 约束 |
|----|---------|------|
| users | login_name, password_hash, display_name, avatar_path, is_admin, is_setup_complete, deleted_at, version | login_name UNIQUE（含已删除）；软删除 |
| tokens | user_id(FK), token(UNIQUE), expires_at | 30天过期；活跃请求自动续期 |
| system_settings | key(UNIQUE), value(TEXT), version | 初始记录：`registration_open=true`, AI 模型配置（provider/model/api_key/base_url） |

**现有表变更**

- 9 张表加 `version` 字段（乐观锁）：candidates / jobs / applications / events / expenses / suppliers / terms / users / system_settings
- 新增字段（全部 nullable，存量数据保持 NULL）：events.actor_id / audit_logs.actor_id / action_receipts.actor_id / candidates.created_by
- 清理 agent 相关代码：删除 ActorType 枚举中的 copilot/agent/system、Event 表的 actor_type CHECK 约束、ActionRequest 中的 ActorInfo/actor 字段；actor_type 列保留但统一写死 "human"，身份识别只靠 actor_id

## 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/register | 注册（login_name + password）→ 返回 token；首个用户自动 is_admin=true |
| POST | /api/v1/auth/login | 登录 → 返回 token + user 信息 |
| POST | /api/v1/auth/logout | 删除当前 token |
| GET | /api/v1/auth/me | 当前用户信息（含 is_admin / is_setup_complete） |
| PUT | /api/v1/auth/me/profile | 完成注册第二步 / 修改个人信息（display_name + avatar）→ 设 is_setup_complete=true |
| PUT | /api/v1/auth/me/password | 修改自己密码（需旧密码） |
| GET | /api/v1/auth/check-login-name/{name} | 实时校验登录账号（格式 + 是否已存在） |
| GET | /api/v1/auth/has-users | 无需认证；前端判断是否首次启动 |

### 用户管理（仅 admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/admin/users | 用户列表（不含已删除） |
| POST | /api/v1/admin/users | 手动创建用户（login_name + password）→ is_setup_complete=false |
| DELETE | /api/v1/admin/users/{id} | 软删除 + 立即失效该用户所有 token |
| PUT | /api/v1/admin/users/{id}/password | 重置密码（直接设新密码，无需旧密码） |
| PUT | /api/v1/admin/users/{id}/admin | 授予/取消 admin（body: {is_admin: bool}） |

### 系统设置（仅 admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/admin/settings | 读取所有系统设置（API Key 脱敏返回） |
| PUT | /api/v1/admin/settings | 批量更新系统设置（带 version 乐观锁） |
| POST | /api/v1/admin/ai/test-connection | 用已保存的 AI 配置发最简请求验证连通性，返回 {ok, model/error} |

### 认证横切

- **所有现有接口**加 `Depends(current_user)`，仅以下除外：login / register / check-login-name / has-users / 静态文件
- **文件接口**（GET /files/{path}、POST /files/upload、POST /files/parse）同样加认证
- 写操作从 token 确定 actor_id，**不信任客户端传入**；删除 ActionRequest 中的 actor 字段，服务端从 current_user 注入 actor_id
- 动作引擎签名加 actor_id；约 15 个绕过动作引擎的写路由逐个注入 current_user
- 无审计的写操作全部补审计：星标、附件增删、suppliers、expenses、terms
- 乐观锁：写操作带 version 比对，不一致返回 409 `{code: "VERSION_CONFLICT", message: "该记录刚被修改过，请刷新"}`

## 页面

### 登录页（/login）
- 字段：登录账号 + 密码（带 👁）
- 底部："还没有账号？注册"（注册关闭时整行消失）+ "忘记账号或密码？请联系管理员"（纯文字不可点）
- 错误统一提示"登录账号或密码错误"，不区分原因
- 首次启动（has-users=false）：显示"首次使用，请创建管理员账号"，引导到注册页

### 注册页（/register）
- 注册关闭时直接跳回 /login
- **第一步**：登录账号（失焦实时校验格式+重复）+ 密码 + 确认密码 → 注册成功自动登录
- **第二步**：头像（可选，不传用统一默认头像；存储路径 `data/avatars/`，Docker 已挂载无需新增 volume）+ 你的名字（必填）→ 完成进系统
- admin 手动创建的用户首次登录后也进第二步

### 个人设置（所有人可见）
- 入口：NavSidebar 左下角 ⚙️ 图标
- 覆盖主内容区，右上角 × 关闭
- 内容：修改名字 / 修改密码（需旧密码）/ 上传头像 / 退出登录

### 系统管理（仅 admin 可见）
- 入口：NavSidebar 左下角 🔧 图标（非 admin 不显示）
- 覆盖主内容区，右上角 × 关闭
- **用户管理**：用户列表（头像 32px + 名字 + admin 标签）+ 右上角 [+新建]
  - 自己那行不显示"更多"
  - "更多"菜单：重置密码 / 设为管理员（或取消管理员）/ 删除用户（砖红）
- **注册设置**：开放注册 toggle，切即生效
- **模型配置**：默认只读展示（API Key 脱敏），点 [修改] 变可编辑
  - 字段：Provider / 模型 / API Key（带 👁）/ Base URL，全部自由输入
  - 编辑态：[保存] + [取消]
  - [测试连接] 按钮：常驻显示（非编辑态也可用），点击后用当前已保存的配置发测试请求，成功/失败给出明确反馈

### NavSidebar 左下角
- Admin：`[头像] 王明 管理员 ⚙️ 🔧`
- 普通用户：`[头像] 李华 ⚙️`
- "管理员"灰色文字标签
- 删除现有 /settings 占位路由；个人设置和系统管理是覆盖层（非独立路由），由 NavSidebar 图标触发

## 业务规则

### 登录账号
- 英文 + 数字 + 下划线，3-20 位
- 全局唯一（含已删除用户，防止混淆历史记录）

### 密码
- 最低 6 位，无复杂度要求
- 存储：bcrypt 哈希（直接使用 `bcrypt` 库，非 passlib）

### Token
- opaque token（非 JWT），数据库存储 SHA256 哈希值（不存明文）；创建时返回原始 token 给客户端，验证时对客户端传入的 token 做 SHA256 后与数据库比对
- 30 天过期，活跃请求自动续期（剩余不足 15 天时续到 +30 天）
- 允许多设备同时登录
- 过期/失效 → 前端 401 拦截 → 跳登录页 → 登录后跳回来源路径

### Admin
- 首个注册用户自动成为 admin
- 可多个 admin；admin 可授予/取消他人 admin
- 不能删除自己、不能取消自己的 admin、最后一个 admin 不能被取消

### 用户删除
- 软删除 + 所有 token 立即失效
- 历史记录保留，用户名灰显
- 不可恢复，admin 看不到已删除用户
- 注册开关可防止被删用户重新注册

### 首次启动
- users 表为空 → /api/v1/auth/has-users 返回 false → 前端引导创建管理员

### 配置迁移
- AI 模型配置从 data/config.json 迁移到 system_settings 表（仅 provider/model/api_key/base_url）
- 删除 config.json 中的 admin_token 字段及相关鉴权代码（被 token 表替代）
- 删除 config.json 中的 email 配置块及相关代码（后续单独做邮件功能时再加）
- ai_client.py 改为从 DB 读取（加内存缓存），删除从文件读取和自动复制 config.example.json 的逻辑
- 首次启动时 system_settings 表为空，AI 配置项初始化为空值（用户通过系统管理页面填写）

### 历史数据
- 新增字段全部 nullable，存量 NULL 不回填
- 前端对 NULL actor_id 显示"—"

## 与其他模块的交互

### 全模块渗透
- **所有写操作**补 actor_id + 审计（动作引擎路径 + 15 个绕过端点）
- **所有可编辑表**加乐观锁 version 字段
- **所有前端页面**加路由守卫（未登录跳 /login）
- **前端 HTTP 层**：client.ts + files.ts 两处都加 token header + 401 拦截

### Event 时间线
- GET /events 返回操作者 display_name（关联 users 表）
- 已删除用户的 display_name 灰显

### 候选人档案
- 显示 created_by 对应的 display_name

### 前端状态
- 新建 Pinia auth store（token + 用户信息 + is_admin）
- 登录/注册/退出/401 统一通过 auth store 管理

### 配置读取
- ai_client.py 从 system_settings 读取，替代 config.json
- 设置变更后清除缓存

## ⚠️ 施工注意

### 前端改造
- HTTP 请求有两条路径（client.ts 统一封装 + files.ts 裸 fetch），认证 header 两处都要加
- 目前没有 Pinia store，需要从零建 auth store
- 路由目前 10 条全部裸奔，需要加 beforeEach 守卫；新增 /login 和 /register 路由
- 现有 /settings 占位路由和 SettingsView 组件删除，个人设置/系统管理改为覆盖层组件

### 后端改造
- ActionRequest 删除 actor 字段（ActorInfo schema 删除），服务端从 current_user 注入 actor_id
- 动作引擎调用链（executor → handler → entity_writer → audit）签名全部加 actor_id 参数
- 硬编码 actor_type="human" 的位置：candidates.py / jobs.py / events.py / actions.py / event.py 模型默认值 / action.py schema
- Event 模型的 actor_type CHECK 约束需要在迁移中删除（清理 agent 相关）
- 15 个无审计的绕过端点：files(2) / suppliers(3) / terms(6) / candidates 星标+附件(3) / expenses(3) — 全部补认证+actor_id+审计
- config.json 相关：删除 admin_token 鉴权逻辑、删除 email 配置块、删除 ai_client.py 的文件读取和自动复制逻辑
