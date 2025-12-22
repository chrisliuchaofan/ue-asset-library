#!/bin/bash

echo "🚀 快速设置 PostgreSQL 数据库"
echo "=================================================="
echo ""

# 检查 Docker 是否安装
if command -v docker &> /dev/null; then
    echo "✅ 检测到 Docker"
    echo ""
    echo "选择操作："
    echo "1. 使用 Docker 启动 PostgreSQL（推荐）"
    echo "2. 检查现有 Docker 容器"
    echo "3. 跳过（手动配置）"
    echo ""
    read -p "请选择 (1-3): " choice
    
    case $choice in
        1)
            echo ""
            echo "📦 启动 PostgreSQL 容器..."
            
            # 检查容器是否已存在
            if docker ps -a | grep -q ue-assets-db; then
                echo "⚠️  容器已存在，正在启动..."
                docker start ue-assets-db
            else
                echo "创建新容器..."
                docker run --name ue-assets-db \
                  -e POSTGRES_USER=ue_user \
                  -e POSTGRES_PASSWORD=ue_password \
                  -e POSTGRES_DB=ue_assets \
                  -p 5432:5432 \
                  -d postgres:15
            fi
            
            echo ""
            echo "⏳ 等待数据库启动（5秒）..."
            sleep 5
            
            # 检查容器状态
            if docker ps | grep -q ue-assets-db; then
                echo "✅ 数据库容器运行中"
                echo ""
                echo "📋 数据库配置信息："
                echo "  DB_HOST=localhost"
                echo "  DB_PORT=5432"
                echo "  DB_USERNAME=ue_user"
                echo "  DB_PASSWORD=ue_password"
                echo "  DB_NAME=ue_assets"
                echo ""
                echo "💡 请将这些信息添加到 backend-api/.env 文件中"
            else
                echo "❌ 容器启动失败，请检查 Docker 日志："
                echo "   docker logs ue-assets-db"
            fi
            ;;
        2)
            echo ""
            echo "📋 现有容器状态："
            docker ps -a | grep ue-assets-db || echo "  没有找到 ue-assets-db 容器"
            ;;
        3)
            echo "跳过 Docker 设置"
            ;;
        *)
            echo "无效选择"
            ;;
    esac
else
    echo "⚠️  未检测到 Docker"
    echo ""
    echo "请选择："
    echo "1. 安装 Docker Desktop（推荐）"
    echo "   下载：https://www.docker.com/products/docker-desktop"
    echo ""
    echo "2. 手动安装 PostgreSQL"
    echo "   macOS: brew install postgresql@15"
    echo "   Linux: sudo apt-get install postgresql"
    echo ""
    echo "3. 使用云数据库（阿里云 RDS）"
    echo "   访问：https://rds.console.aliyun.com/"
fi

echo ""
echo "=================================================="
echo "📝 下一步："
echo "1. 编辑 backend-api/.env 文件"
echo "2. 填写数据库配置信息"
echo "3. 运行: cd backend-api && npm run start:dev"
echo "4. 查看日志，确认数据库连接成功"
echo ""








