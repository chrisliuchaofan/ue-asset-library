#!/bin/bash

# 快速检查后端配置脚本
# 使用方法：在服务器上执行 ./快速检查后端配置.sh

echo "=========================================="
echo "🔍 后端配置检查"
echo "=========================================="
echo ""

# 1. 检查 .env 文件
echo "1️⃣ 检查 .env 文件："
ENV_FILE="/opt/ue-assets-backend/backend-api/.env"
if [ -f "$ENV_FILE" ]; then
  echo "   ✅ .env 文件存在"
  echo ""
  echo "   USER_WHITELIST:"
  grep USER_WHITELIST "$ENV_FILE" || echo "      ❌ 未找到"
  echo ""
  echo "   JWT_SECRET:"
  grep JWT_SECRET "$ENV_FILE" | sed 's/=.*/=***已配置/' || echo "      ❌ 未找到"
  echo ""
  echo "   MODEL_ENABLED:"
  grep MODEL_ENABLED "$ENV_FILE" || echo "      ❌ 未找到"
  echo ""
  echo "   BILLING_ENABLED:"
  grep BILLING_ENABLED "$ENV_FILE" || echo "      ❌ 未找到"
else
  echo "   ❌ .env 文件不存在: $ENV_FILE"
fi

echo ""
echo "2️⃣ 检查 PM2 进程："
if command -v pm2 &> /dev/null; then
  PM2_STATUS=$(pm2 list | grep ue-assets-backend || echo "")
  if [ -n "$PM2_STATUS" ]; then
    echo "   ✅ 后端服务正在运行"
    echo ""
    echo "   进程信息:"
    pm2 show ue-assets-backend 2>/dev/null | grep -E "status|uptime|restarts" || echo "     无法获取"
  else
    echo "   ❌ 后端服务未运行"
  fi
else
  echo "   ⚠️  PM2 未安装或不在 PATH 中"
fi

echo ""
echo "3️⃣ 测试后端 API："
BACKEND_URL="http://localhost:3001"
if command -v curl &> /dev/null; then
  # 测试健康检查
  echo "   健康检查:"
  HEALTH=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    echo "      ✅ 后端 API 可访问"
    echo "      响应: $HEALTH"
  else
    echo "      ❌ 后端 API 不可访问"
  fi
  
  echo ""
  echo "   配置信息（调试接口）:"
  CONFIG=$(curl -s "$BACKEND_URL/auth/debug/config" 2>/dev/null)
  if [ -n "$CONFIG" ]; then
    echo "$CONFIG" | jq . 2>/dev/null || echo "$CONFIG"
  else
    echo "      ⚠️  调试接口不可用（可能需要登录）"
  fi
  
  echo ""
  echo "   测试登录（admin@admin.local + admin123）:"
  LOGIN_RESULT=$(curl -s -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@admin.local","password":"admin123"}' 2>/dev/null)
  if [ -n "$LOGIN_RESULT" ]; then
    echo "$LOGIN_RESULT" | jq . 2>/dev/null || echo "$LOGIN_RESULT"
    if echo "$LOGIN_RESULT" | grep -q "success"; then
      echo "      ✅ 登录成功"
    else
      echo "      ❌ 登录失败"
    fi
  else
    echo "      ❌ 无法连接到后端"
  fi
else
  echo "   ⚠️  curl 未安装"
fi

echo ""
echo "=========================================="
echo "✅ 检查完成"
echo "=========================================="
echo ""
echo "💡 提示："
echo "   - 如果 USER_WHITELIST 未配置，请编辑 .env 文件"
echo "   - 配置格式：USER_WHITELIST=admin@admin.local:admin123"
echo "   - 修改后需要重启服务：pm2 restart ue-assets-backend --update-env"







