# 🧪 Dry Run 模式使用指南

## 📋 什么是 Dry Run 模式？

Dry Run 模式允许你在**不消耗真实费用**的情况下测试完整的 AI 生成流程：
- ✅ 不调用真实 AI 模型（返回 mock 数据）
- ✅ 不产生真实扣费（返回模拟结果）
- ✅ 完整流程可测试（Job 流程正常跑通）

---

## 🚀 快速开始

### 步骤 1：配置后端 Dry Run 模式

在**后端服务器**的 `.env` 文件中添加：

```env
# Dry Run 模式配置（0成本测试）
MODEL_ENABLED=false          # 禁用真实模型调用，返回 mock 数据
BILLING_ENABLED=false        # 禁用真实扣费，返回模拟结果
```

### 步骤 2：重启后端服务

```bash
# SSH 登录到后端服务器
cd /opt/ue-assets-backend/backend-api

# 重启服务（加载新环境变量）
pm2 restart ue-assets-backend --update-env

# 验证服务状态
pm2 logs ue-assets-backend --lines 20
```

### 步骤 3：配置前端环境变量（可选）

如果你想在前端直接调用后端 API（推荐），需要在**前端项目**的 `.env.local` 或 Vercel 环境变量中添加：

```env
# 后端 API 地址
NEXT_PUBLIC_BACKEND_API_URL=https://api.factory-buy.com

# 后端测试用户凭据（用于获取 token）
BACKEND_TEST_EMAIL=test@factory-buy.com
BACKEND_TEST_PASSWORD=password123
```

**注意：** 如果不配置前端环境变量，前端会 fallback 到本地 AI 服务（不会使用 dry run 模式）。

---

## 🧪 测试流程

### 方式 1：通过前端界面测试（推荐）

1. **打开造梦工厂页面**
   - 访问：`http://localhost:3000/dream-factory`（本地）或生产环境 URL

2. **输入创意并生成**
   - 在"创意构想"步骤输入内容（如："河马"）
   - 点击"生成"按钮

3. **验证 Dry Run 模式**
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签页，找到 `/api/ai/generate-text` 请求
   - 检查响应，应该包含：
     ```json
     {
       "text": "[Mock Response] 输入: \"河马\"...",
       "raw": {
         "mock": true,
         "dryRun": true
       }
     }
     ```

4. **验证流程完整性**
   - 创意生成 → 方案选择 → 分镜生成 → 画面生成 → 视频生成
   - 所有步骤都应该能正常跑通，但返回的是 mock 数据

### 方式 2：通过 API 直接测试

#### 测试 1：验证 Dry Run 模型调用

```bash
# 1. 登录获取 token
TOKEN=$(curl -X POST https://api.factory-buy.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@factory-buy.com","password":"password123"}' \
  | jq -r '.token')

# 2. 调用 AI 生成（Dry Run 模式）
curl -X POST https://api.factory-buy.com/ai/generate-text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "你好，请介绍一下你自己",
    "presetId": "qwen-turbo-standard"
  }' | jq .
```

**预期结果：**
```json
{
  "text": "[Mock Response] 输入: \"你好，请介绍一下你自己\"...",
  "raw": {
    "mock": true,
    "dryRun": true,
    "input": "你好，请介绍一下你自己",
    "timestamp": "2024-..."
  }
}
```

#### 测试 2：验证 Dry Run 扣费

```bash
# 1. 查询当前余额
BALANCE_BEFORE=$(curl https://api.factory-buy.com/credits/balance \
  -H "Authorization: Bearer $TOKEN" | jq -r '.balance')

echo "余额（扣费前）: $BALANCE_BEFORE"

# 2. 消费积分（Dry Run 模式）
curl -X POST https://api.factory-buy.com/credits/consume \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 10,
    "action": "test_dry_run"
  }' | jq .

# 3. 再次查询余额（应该不变）
BALANCE_AFTER=$(curl https://api.factory-buy.com/credits/balance \
  -H "Authorization: Bearer $TOKEN" | jq -r '.balance')

echo "余额（扣费后）: $BALANCE_AFTER"

# 验证：余额应该不变
if [ "$BALANCE_BEFORE" == "$BALANCE_AFTER" ]; then
  echo "✅ Dry Run 模式正常：余额未变化"
else
  echo "❌ Dry Run 模式异常：余额发生变化"
fi
```

**预期结果：**
```json
{
  "success": true,
  "balance": 100,  // 余额不变
  "transactionId": "mock-txn-1234567890-abc123",
  "isDryRun": true  // 标记为 Dry Run
}
```

---

## ✅ 验证清单

### 后端验证

- [ ] `MODEL_ENABLED=false` 已配置
- [ ] `BILLING_ENABLED=false` 已配置
- [ ] 后端服务已重启
- [ ] API 返回 `raw.mock: true`
- [ ] API 返回 `isDryRun: true`（扣费接口）

### 前端验证

- [ ] `NEXT_PUBLIC_BACKEND_API_URL` 已配置（可选）
- [ ] `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD` 已配置（可选）
- [ ] 前端能正常调用 `/api/ai/generate-text`
- [ ] 响应包含 mock 数据标记

### 流程验证

- [ ] 创意生成步骤正常
- [ ] 方案选择步骤正常
- [ ] 分镜生成步骤正常
- [ ] 画面生成步骤正常（如果有）
- [ ] 视频生成步骤正常（如果有）
- [ ] 所有步骤返回 mock 数据，不产生真实费用

---

## 🔍 故障排查

### 问题 1：前端仍然调用真实模型

**症状：** 前端返回真实 AI 响应，不是 mock 数据

**原因：** 前端没有配置后端 API URL，fallback 到了本地 AI 服务

**解决：**
1. 检查前端环境变量 `NEXT_PUBLIC_BACKEND_API_URL` 是否配置
2. 检查后端 API 是否可访问
3. 检查后端认证 token 是否正确获取

### 问题 2：后端仍然产生真实扣费

**症状：** 余额发生变化，数据库中有新交易记录

**原因：** `BILLING_ENABLED=false` 未生效

**解决：**
1. 检查后端 `.env` 文件中 `BILLING_ENABLED=false` 是否正确配置
2. 确认后端服务已重启（`pm2 restart ue-assets-backend --update-env`）
3. 检查后端日志，确认 Dry Run 模式已启用

### 问题 3：后端仍然调用真实模型

**症状：** API 返回真实 AI 响应，不是 mock 数据

**原因：** `MODEL_ENABLED=false` 未生效

**解决：**
1. 检查后端 `.env` 文件中 `MODEL_ENABLED=false` 是否正确配置
2. 确认后端服务已重启
3. 检查后端日志，确认 Dry Run 模式已启用

### 问题 4：前端 API 返回 401 错误

**症状：** `/api/ai/generate-text` 返回 401 Unauthorized

**原因：** 后端 API 需要认证，但前端没有正确传递 token

**解决：**
1. 检查 `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD` 是否配置
2. 检查后端用户白名单是否包含测试用户
3. 查看前端 API 路由日志，确认 token 获取是否成功

---

## 📊 完整测试脚本

创建一个测试脚本 `test-dry-run.sh`：

```bash
#!/bin/bash

# Dry Run 模式完整测试脚本

BACKEND_URL="https://api.factory-buy.com"
EMAIL="test@factory-buy.com"
PASSWORD="password123"

echo "🧪 开始 Dry Run 模式测试..."
echo ""

# 1. 登录
echo "1️⃣ 登录..."
TOKEN=$(curl -s -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi
echo "✅ 登录成功"
echo ""

# 2. 测试 Dry Run 模型调用
echo "2️⃣ 测试 Dry Run 模型调用..."
RESPONSE=$(curl -s -X POST $BACKEND_URL/ai/generate-text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "测试提示词",
    "presetId": "qwen-turbo-standard"
  }')

if echo "$RESPONSE" | jq -e '.raw.mock == true' > /dev/null; then
  echo "✅ Dry Run 模式正常（模型调用）"
  echo "$RESPONSE" | jq -r '.text' | head -c 100
  echo "..."
else
  echo "❌ Dry Run 模式异常（模型调用）"
  echo "$RESPONSE" | jq .
  exit 1
fi
echo ""

# 3. 测试 Dry Run 扣费
echo "3️⃣ 测试 Dry Run 扣费..."
BALANCE_BEFORE=$(curl -s $BACKEND_URL/credits/balance \
  -H "Authorization: Bearer $TOKEN" | jq -r '.balance')

echo "余额（扣费前）: $BALANCE_BEFORE"

CONSUME_RESPONSE=$(curl -s -X POST $BACKEND_URL/credits/consume \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 10,
    "action": "test_dry_run"
  }')

if echo "$CONSUME_RESPONSE" | jq -e '.isDryRun == true' > /dev/null; then
  echo "✅ Dry Run 模式正常（扣费）"
else
  echo "❌ Dry Run 模式异常（扣费）"
  echo "$CONSUME_RESPONSE" | jq .
  exit 1
fi

BALANCE_AFTER=$(curl -s $BACKEND_URL/credits/balance \
  -H "Authorization: Bearer $TOKEN" | jq -r '.balance')

echo "余额（扣费后）: $BALANCE_AFTER"

if [ "$BALANCE_BEFORE" == "$BALANCE_AFTER" ]; then
  echo "✅ 余额未变化（Dry Run 正常）"
else
  echo "❌ 余额发生变化（Dry Run 异常）"
  exit 1
fi
echo ""

echo "🎉 所有测试通过！Dry Run 模式正常工作！"
```

运行测试：

```bash
chmod +x test-dry-run.sh
./test-dry-run.sh
```

---

## 📝 注意事项

1. **Dry Run 模式必须同时配置两个环境变量**
   - `MODEL_ENABLED=false`：禁用真实模型调用
   - `BILLING_ENABLED=false`：禁用真实扣费
   - 只配置一个会导致部分功能仍然产生费用

2. **生产环境测试**
   - 在生产环境测试时，确保 `NODE_ENV=production`
   - 验证参数白名单是否生效

3. **数据库约束**
   - 即使 Dry Run 模式，数据库唯一约束仍然生效
   - 幂等性检查仍然正常工作

4. **Mock 数据格式**
   - Dry Run 模式返回的 mock 数据格式与真实数据一致
   - 前端代码无需修改，可以直接使用

---

## 🎯 总结

使用 Dry Run 模式，你可以：
- ✅ **0 成本**测试完整流程
- ✅ **安全**验证所有功能
- ✅ **快速**迭代和调试
- ✅ **完整**回归测试

**配置完成后，就可以放心测试了！** 🚀







