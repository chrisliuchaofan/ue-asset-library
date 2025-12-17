/**
 * NestJS 后端 API 入口文件
 * 如果使用 Express，请参考 src/index-express.ts
 */

// 加载 .env 文件
// 使用 dotenv/config 会自动从项目根目录加载 .env 文件
import 'dotenv/config';
import { resolve } from 'path';

// 明确指定 .env 文件路径（编译后 dist 目录的上级目录）
import { config } from 'dotenv';
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

// 调试：输出数据库配置（不显示密码）
console.log('[Main] .env 文件路径:', envPath);
console.log('[Main] 环境变量检查：', {
  DB_HOST: process.env.DB_HOST || '未设置',
  DB_PORT: process.env.DB_PORT || '未设置',
  DB_NAME: process.env.DB_NAME || '未设置',
  DB_USERNAME: process.env.DB_USERNAME || '未设置',
  DB_PASSWORD: process.env.DB_PASSWORD ? '已设置' : '未设置',
  NODE_ENV: process.env.NODE_ENV || '未设置',
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // ✅ 修复 #1：完善 CORS 配置
  // 支持多个前端域名（开发和生产环境）
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // ✅ 新增：从环境变量读取多个允许的域名（用逗号分隔）
  const additionalOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',  // ✅ 显式允许 localhost:3000
    'http://127.0.0.1:3000',  // ✅ 显式允许 127.0.0.1:3000
    'https://www.factory-buy.com',
    'https://factory-buy.com',
    // ✅ 新增：添加所有额外的允许域名
    ...additionalOrigins,
  ].filter(Boolean);
  
  // 开发环境允许所有来源（方便本地调试）
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  console.log('[CORS] 配置详情:', {
    isDevelopment,
    allowedOrigins,
    frontendUrl,
    additionalOrigins,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  
  app.enableCors({
    origin: (origin, callback) => {
      // 开发环境：允许所有来源（包括 localhost:3000 和 127.0.0.1:3000）
      if (isDevelopment) {
        console.log('[CORS] 开发模式：允许所有来源:', origin || '无 origin（如 Postman/curl）');
        return callback(null, true);
      }
      
      // 允许没有 origin 的请求（如 Postman、curl）
      if (!origin) {
        console.log('[CORS] 允许无 origin 的请求（如 Postman/curl）');
        return callback(null, true);
      }
      
      // ✅ 修复：支持通配符匹配和精确匹配
      const isAllowed = allowedOrigins.some(allowed => {
        // 支持通配符匹配（如 *.vercel.app）
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        // 精确匹配或前缀匹配
        return origin === allowed || origin.startsWith(allowed);
      });
      
      if (isAllowed) {
        console.log('[CORS] ✅ 允许来源:', origin);
        callback(null, true);
      } else {
        console.warn('[CORS] ❌ 拒绝来源:', origin, '（不在允许列表中）');
        console.warn('[CORS] 当前允许的域名:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'], // ✅ 包含 Authorization header
  });

  // ✅ 修复 #2：在生产环境强制使用 HTTPS（如果配置了反向代理）
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_HTTPS_DISABLED) {
    app.use((req, res, next) => {
      // 检查 X-Forwarded-Proto 头（Nginx 反向代理会设置）
      const forwardedProto = req.headers['x-forwarded-proto'];
      const host = req.headers.host;
      
      // 如果请求是 HTTP 且 host 包含 api.，重定向到 HTTPS
      if (forwardedProto !== 'https' && host && (host.includes('api.') || host.includes('your-domain.com'))) {
        console.warn('[Main] ⚠️ 检测到 HTTP 请求，重定向到 HTTPS:', { host, url: req.url });
        return res.redirect(301, `https://${host}${req.url}`);
      }
      next();
    });
  }

  // ⚠️ 强制使用 3001 端口（本地开发环境）
  // 如果环境变量 PORT 被设置为其他值，这里会覆盖它
  const port = parseInt(process.env.PORT || '3001', 10);
  
  // 如果端口不是 3001，输出警告
  if (port !== 3001) {
    console.warn(`[Main] ⚠️  警告：端口被设置为 ${port}，但本地开发环境应该使用 3001`);
    console.warn(`[Main] 如果这是有意的，请忽略此警告。否则请检查环境变量 PORT`);
  }
  
  // 监听所有网络接口（0.0.0.0），允许外部访问
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend API running on port ${port}`);
  console.log(`📡 Listening on: 0.0.0.0:${port} (accessible from external IPs)`);
  console.log(`📡 Frontend URL: ${frontendUrl}`);
  console.log(`🌍 CORS: ${isDevelopment ? '允许所有来源（开发模式）' : '仅允许配置的来源'}`);
  console.log(`🌍 CORS 配置已启用，允许的 Headers: Content-Type, Authorization, X-User-Id`);
  console.log(`✅ Auto-deploy test: ${new Date().toISOString()}`);
  console.log(`\n📝 提示：如果前端无法连接，请检查：`);
  console.log(`   1. 前端配置的 BACKEND_API_URL 是否为 https://api.your-domain.com（生产环境必须使用 HTTPS）`);
  console.log(`   2. 浏览器控制台是否有 CORS 错误`);
  console.log(`   3. 网络防火墙是否阻止了连接`);
  console.log(`   4. ALLOWED_ORIGINS 环境变量是否包含前端域名\n`);
}

bootstrap();

