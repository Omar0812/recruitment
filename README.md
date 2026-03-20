# 招聘管理工具

一款本地运行的招聘全流程管理工具，帮助 HR 和招聘团队高效管理从候选人录入到入职的完整流程。

所有数据保存在你自己的电脑上，不上传任何信息。

## 安装

前置条件：安装 Docker。
- Mac / Windows：安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Linux：安装 [Docker Engine](https://docs.docker.com/engine/install/)

打开终端，粘贴这一行：

```bash
docker run -d --name recruitment -p 8000:8000 -v ~/recruitment/data:/app/data --restart unless-stopped ghcr.io/omar0812/recruitment:latest
```

启动后访问 http://localhost:8000

### 更新到最新版

```bash
docker pull ghcr.io/omar0812/recruitment:latest && docker restart recruitment
```

### 停止 / 启动

```bash
docker stop recruitment     # 停止
docker start recruitment    # 启动
```

### 卸载

```bash
docker stop recruitment && docker rm recruitment   # 删除容器
rm -rf ~/recruitment                                # 删除数据（不可恢复）
```

---

## 核心功能

### 今日简报
打开就能看到当天要做的事：待安排的候选人、即将到来的面试、待处理的 Offer。不需要翻找，一目了然。

### 候选人管理
- **新建候选人**：支持手动录入或上传简历（PDF/Word），AI 自动解析基本信息
- **人才库**：所有候选人统一管理，支持按技能、状态筛选
- **候选人面板**：点击任意候选人查看完整档案、时间线、关联的岗位

### 招聘流程看板（Pipeline）
- 看板视图展示所有进行中的候选人
- 拖拽或点击推进阶段：简历筛选 → 面试 → Offer → 入职
- 每一步操作都会自动记录到时间线

### 岗位管理
- 创建和管理招聘岗位
- 查看每个岗位关联的候选人和进展
- 支持关闭岗位（自动处理进行中的候选人）

### 数据分析
- 招聘漏斗、周期分析、渠道效果
- 按岗位 / 渠道 / 时间段筛选查看

### 渠道管理
- 管理招聘渠道（猎头、招聘平台等）
- 追踪各渠道的推荐人数、入职人数、费用

### 公司设置
- 管理部门、地点、招聘条款模板

---

## 可选：AI 简历解析

上传简历时自动识别姓名、电话、工作经历等信息。

首次启动后自动生成配置文件 `~/recruitment/data/config.json`，编辑它填入 API Key，然后重启：

```bash
docker restart recruitment
```

支持的 AI 服务：OpenAI (GPT-4o) / Anthropic (Claude) / Google Gemini / 任何 OpenAI 兼容接口

> 不配置 AI 也能正常使用，只是需要手动填写候选人信息。

> Word 简历预览和图片 OCR 识别已内置在 Docker 镜像中，无需额外安装。

---

## 数据存储

所有数据保存在本地 `data/` 目录（通过 Docker volume 映射，数据在容器外持久保存）：
- 数据库：`data/recruitment.db`
- 简历文件：`data/resumes/`

**备份**：复制 `data/` 目录即可。
**迁移**：把 `data/` 目录复制到新电脑的相同位置。

---

## 反馈

使用中遇到问题或有建议，请直接告诉我！
