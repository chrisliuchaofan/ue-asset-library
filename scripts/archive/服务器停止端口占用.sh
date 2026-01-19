#!/bin/bash

# 在服务器上停止占用端口 3001 的进程

echo "=== 停止占用端口 3001 的进程 ==="
echo ""

# 查找占用端口的进程
PID=$(lsof -ti:3001 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3001 | awk '{print $7}' | cut -d'/' -f1 | head -1)

if [ -z "$PID" ]; then
    echo "✅ 端口 3001 未被占用"
    exit 0
fi

echo "找到占用端口的进程："
ps -p "$PID" -o pid,command 2>/dev/null || echo "进程 ID: $PID"
echo ""

echo "正在停止进程 $PID..."
kill "$PID" 2>/dev/null

# 等待进程停止
sleep 2

# 检查是否还在运行
if ps -p "$PID" > /dev/null 2>&1; then
    echo "⚠️  进程仍在运行，强制停止..."
    kill -9 "$PID" 2>/dev/null
    sleep 1
fi

# 再次检查端口
NEW_PID=$(lsof -ti:3001 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3001 | awk '{print $7}' | cut -d'/' -f1 | head -1)

if [ -n "$NEW_PID" ]; then
    echo "❌ 端口仍被占用（进程: $NEW_PID）"
    echo "尝试强制停止..."
    kill -9 "$NEW_PID" 2>/dev/null
    sleep 1
fi

# 最终检查
FINAL_PID=$(lsof -ti:3001 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3001 | awk '{print $7}' | cut -d'/' -f1 | head -1)

if [ -z "$FINAL_PID" ]; then
    echo "✅ 端口 3001 已释放"
    echo "现在可以重新启动后端服务了"
else
    echo "❌ 端口仍被占用，请手动检查："
    echo "   lsof -i:3001"
    echo "   或"
    echo "   netstat -tlnp | grep 3001"
fi









