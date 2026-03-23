#!/bin/sh
# 修复 data 目录权限（兼容从 root 容器升级的场景）
chown -R appuser:appuser /app/data 2>/dev/null || true
exec gosu appuser python main.py
