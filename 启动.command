#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# 首次运行时自动创建虚拟环境并安装依赖
if [ ! -d ".venv" ]; then
    echo "首次启动，正在初始化环境（约1-2分钟）..."
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
    echo "初始化完成！"
fi

# 前端构建（如需重新构建，取消下方注释）
# if [ -d "frontend" ]; then
#     echo "构建前端..."
#     cd frontend && npm install && npm run build && cd ..
# fi

echo "启动招聘管理工具..."

# 如果 8000 端口被占用，先关掉旧进程
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
sleep 1

.venv/bin/python3 main.py
