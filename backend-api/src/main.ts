/**
 * NestJS 后端 API 入口文件
 * 如果使用 Express，请参考 src/index-express.ts
 */

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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend API running on port ${port}`);
  console.log(`📡 Frontend URL: ${frontendUrl}`);
}

bootstrap();

