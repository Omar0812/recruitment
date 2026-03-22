#!/usr/bin/env bash
set -euo pipefail

# SQLite 定时备份脚本
# 用法: scripts/backup.sh [数据库路径] [备份根目录]
# 示例 crontab: 0 3 * * * cd /path/to/recruitment && scripts/backup.sh

DB_PATH="${1:-data/recruitment.db}"
BACKUP_DIR="${2:-backup}"

# 检查源数据库
if [ ! -f "$DB_PATH" ]; then
    echo "错误: 数据库文件不存在 — $DB_PATH" >&2
    exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"

# 生成带时间戳的文件名
FILENAME="recruitment_$(date +%Y%m%d_%H%M%S).db"
DAILY_PATH="$BACKUP_DIR/daily/$FILENAME"

# 执行热备份（不锁数据库）
sqlite3 "$DB_PATH" ".backup '$DAILY_PATH'"
echo "每日备份完成: $DAILY_PATH"

# 验证备份完整性
INTEGRITY=$(sqlite3 "$DAILY_PATH" "PRAGMA integrity_check")
if [ "$INTEGRITY" != "ok" ]; then
    echo "错误: 备份文件完整性检查失败 — $INTEGRITY" >&2
    exit 1
fi
echo "完整性验证通过"

# 周日额外复制到 weekly
DOW=$(date +%u)
if [ "$DOW" = "7" ]; then
    cp "$DAILY_PATH" "$BACKUP_DIR/weekly/$FILENAME"
    echo "周备份完成: $BACKUP_DIR/weekly/$FILENAME"
fi

# 清理过期备份
find "$BACKUP_DIR/daily" -name "*.db" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR/weekly" -name "*.db" -mtime +30 -delete 2>/dev/null || true

echo "备份完成 ✓"
