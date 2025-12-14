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

  // CORS 配置
  // 支持多个前端域名（开发和生产环境）
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'https://www.factory-buy.com',
    'https://factory-buy.com',
  ].filter(Boolean); // 移除空值
  
  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如 Postman、curl）
      if (!origin) {
        return callback(null, true);
      }
      // 检查 origin 是否在允许列表中
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend API running on port ${port}`);
  console.log(`📡 Frontend URL: ${frontendUrl}`);
  console.log(`✅ Auto-deploy test: ${new Date().toISOString()}`);
}

bootstrap();

