# 实施检查清单

## ✅ 已完成的功能

### 1. 认证系统
- [x] NextAuth 配置支持邮箱+密码登录
- [x] 支持环境变量白名单
- [x] 支持后端 API 验证
- [x] 登录页面支持邮箱+密码
- [x] middleware.ts 保护 `/dream-factory` 和 `/dashboard` 路由
- [x] 后端 token 存储在 session 中

### 2. 积分系统
- [x] 后端 API 客户端 (`lib/backend-client.ts`)
- [x] 即梦 API 调用前扣积分
- [x] 积分不足返回 402 错误
- [x] 积分扣除后记录日志
- [x] Dashboard 显示积分余额

### 3. OSS 路径隔离
- [x] OSS 客户端支持用户路径 (`getUserOSSPath`)
- [x] 上传函数支持用户隔离 (`uploadToUserPath`)
- [x] 即梦 provider 使用用户隔离路径

### 4. 后端 API（ECS）
- [x] NestJS 项目结构
- [x] 健康检查接口 (`/health`)
- [x] 认证接口 (`/auth/login`, `/auth/verify`)
- [x] 积分接口 (`/credits/balance`, `/credits/consume`)
- [x] 日志接口 (`/logs/create`)

### 5. 文档
- [x] 环境变量清单 (`ENV_VARIABLES.md`)
- [x] 后端 API 配置指南 (`BACKEND_API_SETUP.md`)
- [x] 完整部署指南 (`DEPLOYMENT_GUIDE.md`)
- [x] 架构总结 (`ARCHITECTURE_SUMMARY.md`)

## 🔧 需要配置的事项

### Vercel 环境变量
- [ ] `NEXTAUTH_SECRET` - 生成强随机密钥
- [ ] `NEXTAUTH_URL` - 配置 Vercel 域名
- [ ] `BACKEND_API_URL` - 配置后端 API 地址
- [ ] `USER_WHITELIST` - 配置测试用户
- [ ] OSS 相关变量（已有）
- [ ] AI 相关变量（已有）

### ECS 环境变量
- [ ] `PORT=3001`
- [ ] `FRONTEND_URL` - Vercel 域名
- [ ] `JWT_SECRET` - 与 NextAuth 一致
- [ ] `USER_WHITELIST` - 与 Vercel 一致
- [ ] `INITIAL_CREDITS=100`

### 服务器配置
- [ ] Node.js 安装（v20+）
- [ ] PM2 安装和配置
- [ ] Nginx 配置（可选）
- [ ] SSL 证书配置（可选）
- [ ] 防火墙配置

## 🧪 测试步骤

### 1. 后端 API 测试

```bash
# 健康检查
curl https://api.your-domain.com/health

# 用户登录
curl -X POST https://api.your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password1"}'
```

### 2. 前端连接测试

```bash
# 在浏览器控制台
fetch('/api/backend/credits/balance').then(r => r.json()).then(console.log);
```

### 3. 完整流程测试

1. 访问 `/dream-factory` → 应跳转到登录页
2. 使用白名单账号登录
3. 进入梦工厂，生成视频
4. 检查积分是否扣除
5. 检查 OSS 文件是否在用户路径下

## ⚠️ 注意事项

1. **Token 传递问题**：
   - 当前实现：后端 token 存储在 NextAuth session 中
   - 如果后端不可用，白名单用户仍可登录（但无法使用积分功能）
   - 建议：后端 API 支持从 NextAuth session 验证，减少 token 传递

2. **数据持久化**：
   - 当前使用内存存储（积分、日志）
   - 生产环境建议使用数据库（MongoDB/PostgreSQL）

3. **错误处理**：
   - 后端不可用时，前端会显示错误
   - 建议添加重试机制和降级方案

4. **安全性**：
   - JWT 密钥必须强随机
   - 使用 HTTPS
   - 配置 CORS 限制

## 📝 后续优化建议

1. **数据库集成**：将内存存储改为数据库
2. **用户注册**：添加用户注册功能
3. **积分充值**：添加积分充值接口
4. **Token 刷新**：实现后端 token 自动刷新
5. **监控告警**：集成监控和告警系统


