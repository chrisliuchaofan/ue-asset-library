#!/bin/bash

echo "=== 后端连接诊断 ==="
echo ""

# 1. 检查后端服务是否运行
echo "1. 检查后端服务状态..."
BACKEND_URL="${NEXT_PUBLIC_BACKEND_API_URL:-${BACKEND_API_URL:-http://localhost:3001}}"
echo "   后端 URL: $BACKEND_URL"

if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo "   ✅ 后端服务正在运行"
else
    echo "   ❌ 后端服务未运行或无法访问"
    echo "   请检查："
    echo "   - 后端服务是否已启动（cd backend-api && npm run start:dev）"
    echo "   - 后端端口是否正确（默认 3001）"
    echo "   - BACKEND_API_URL 环境变量是否正确"
fi
echo ""

# 2. 检查前端配置
echo "2. 检查前端配置..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local 文件存在"
    if grep -q "BACKEND_TEST_EMAIL" .env.local; then
        BACKEND_EMAIL=$(grep "BACKEND_TEST_EMAIL" .env.local | cut -d'=' -f2)
        echo "   BACKEND_TEST_EMAIL: $BACKEND_EMAIL"
    else
        echo "   ⚠️  BACKEND_TEST_EMAIL 未配置"
    fi
    
    if grep -q "BACKEND_TEST_PASSWORD" .env.local; then
        echo "   ✅ BACKEND_TEST_PASSWORD 已配置"
    else
        echo "   ⚠️  BACKEND_TEST_PASSWORD 未配置"
    fi
else
    echo "   ⚠️  .env.local 文件不存在"
fi
echo ""

# 3. 检查后端配置
echo "3. 检查后端配置..."
if [ -f backend-api/.env ]; then
    echo "   ✅ backend-api/.env 文件存在"
    if grep -q "USER_WHITELIST" backend-api/.env; then
        USER_WHITELIST=$(grep "USER_WHITELIST" backend-api/.env | cut -d'=' -f2)
        echo "   USER_WHITELIST: $USER_WHITELIST"
        
        # 解析白名单
        IFS=',' read -ra USERS <<< "$USER_WHITELIST"
        for user in "${USERS[@]}"; do
            IFS=':' read -ra PARTS <<< "$user"
            EMAIL="${PARTS[0]}"
            PASSWORD="${PARTS[1]}"
            echo "      - 邮箱: $EMAIL, 密码: ${PASSWORD:0:3}***"
        done
    else
        echo "   ⚠️  USER_WHITELIST 未配置"
    fi
else
    echo "   ⚠️  backend-api/.env 文件不存在"
fi
echo ""

# 4. 测试后端登录
echo "4. 测试后端登录..."
if [ -f .env.local ] && [ -f backend-api/.env ]; then
    BACKEND_EMAIL=$(grep "BACKEND_TEST_EMAIL" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d ' ')
    BACKEND_PASSWORD=$(grep "BACKEND_TEST_PASSWORD" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d ' ')
    
    if [ -n "$BACKEND_EMAIL" ] && [ -n "$BACKEND_PASSWORD" ]; then
        echo "   尝试登录: $BACKEND_EMAIL"
        RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$BACKEND_EMAIL\",\"password\":\"$BACKEND_PASSWORD\"}")
        
        if echo "$RESPONSE" | grep -q "token"; then
            echo "   ✅ 登录成功"
        else
            echo "   ❌ 登录失败"
            echo "   响应: $RESPONSE"
        fi
    else
        echo "   ⚠️  无法测试登录（缺少配置）"
    fi
else
    echo "   ⚠️  无法测试登录（缺少配置文件）"
fi
echo ""

# 5. 测试 projects 路由
echo "5. 测试 projects 路由..."
if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    # 先获取 token
    if [ -n "$BACKEND_EMAIL" ] && [ -n "$BACKEND_PASSWORD" ]; then
        TOKEN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$BACKEND_EMAIL\",\"password\":\"$BACKEND_PASSWORD\"}")
        TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        
        if [ -n "$TOKEN" ]; then
            PROJECTS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/projects" \
                -H "Authorization: Bearer $TOKEN")
            
            if echo "$PROJECTS_RESPONSE" | grep -q "projects\|\[\]"; then
                echo "   ✅ /projects 路由可访问"
            else
                echo "   ❌ /projects 路由返回错误"
                echo "   响应: $PROJECTS_RESPONSE"
            fi
        else
            echo "   ⚠️  无法获取 token"
        fi
    else
        echo "   ⚠️  无法测试（需要先登录）"
    fi
else
    echo "   ⚠️  后端服务未运行，无法测试"
fi
echo ""

echo "=== 诊断完成 ==="
echo ""
echo "如果后端服务未运行，请执行："
echo "  cd backend-api"
echo "  npm run start:dev"
echo ""








