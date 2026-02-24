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

echo "启动招聘管理工具..."
.venv/bin/python3 main.py
