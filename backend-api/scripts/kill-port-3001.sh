#!/bin/bash

# 停止占用端口 3001 的进程

echo "=== 停止占用端口 3001 的进程 ==="
echo ""

# 查找占用端口的进程
PID=$(lsof -ti:3001)

if [ -z "$PID" ]; then
    echo "✅ 端口 3001 未被占用"
    exit 0
fi

echo "找到占用端口的进程："
ps -p "$PID" -o pid,command
echo ""

read -p "是否要停止此进程？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在停止进程 $PID..."
    kill "$PID"
    
    # 等待进程停止
    sleep 2
    
    # 检查是否还在运行
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️  进程仍在运行，强制停止..."
        kill -9 "$PID"
        sleep 1
    fi
    
    # 再次检查端口
    if lsof -ti:3001 > /dev/null 2>&1; then
        echo "❌ 端口仍被占用"
    else
        echo "✅ 端口 3001 已释放"
        echo "现在可以重新启动后端服务了"
    fi
else
    echo "已取消"
fi


