#!/bin/bash

# 强制停止占用端口 3001 的所有进程

echo "=== 强制停止占用端口 3001 的进程 ==="
echo ""

# 方法 1：使用 lsof
if command -v lsof &> /dev/null; then
    echo "使用 lsof 查找进程..."
    PIDS=$(lsof -ti:3001 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "找到进程: $PIDS"
        echo "$PIDS" | xargs kill -9 2>/dev/null
        echo "已停止进程"
    fi
fi

# 方法 2：使用 fuser
if command -v fuser &> /dev/null; then
    echo "使用 fuser 停止进程..."
    fuser -k 3001/tcp 2>/dev/null
fi

# 方法 3：使用 netstat + kill
if command -v netstat &> /dev/null; then
    echo "使用 netstat 查找进程..."
    NETSTAT_PIDS=$(netstat -tlnp 2>/dev/null | grep :3001 | awk '{print $7}' | cut -d'/' -f1 | grep -v "^$" | sort -u)
    if [ -n "$NETSTAT_PIDS" ]; then
        echo "找到进程: $NETSTAT_PIDS"
        echo "$NETSTAT_PIDS" | xargs kill -9 2>/dev/null
    fi
fi

# 方法 4：使用 ss（如果可用）
if command -v ss &> /dev/null; then
    echo "使用 ss 查找进程..."
    SS_PIDS=$(ss -tlnp 2>/dev/null | grep :3001 | grep -oP 'pid=\K[0-9]+' | sort -u)
    if [ -n "$SS_PIDS" ]; then
        echo "找到进程: $SS_PIDS"
        echo "$SS_PIDS" | xargs kill -9 2>/dev/null
    fi
fi

# 方法 5：停止所有相关的 node/nest 进程
echo "停止所有相关的 node 进程..."
pkill -9 -f "ts-node-dev" 2>/dev/null
pkill -9 -f "node.*backend-api" 2>/dev/null
pkill -9 -f "node.*main.ts" 2>/dev/null

# 等待进程完全停止
sleep 2

# 最终验证
echo ""
echo "验证端口状态..."
if command -v lsof &> /dev/null; then
    REMAINING=$(lsof -ti:3001 2>/dev/null)
    if [ -z "$REMAINING" ]; then
        echo "✅ 端口 3001 已释放"
    else
        echo "❌ 端口仍被占用，进程: $REMAINING"
        echo "尝试最后一次强制停止..."
        echo "$REMAINING" | xargs kill -9 2>/dev/null
        sleep 1
    fi
elif command -v netstat &> /dev/null; then
    REMAINING=$(netstat -tlnp 2>/dev/null | grep :3001)
    if [ -z "$REMAINING" ]; then
        echo "✅ 端口 3001 已释放"
    else
        echo "❌ 端口仍被占用"
        echo "$REMAINING"
    fi
else
    echo "⚠️  无法验证端口状态（lsof 和 netstat 都不可用）"
fi

echo ""
echo "现在可以尝试重新启动服务了"









