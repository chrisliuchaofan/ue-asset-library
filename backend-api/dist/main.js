"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = require("path");
const dotenv_1 = require("dotenv");
const envPath = (0, path_1.resolve)(__dirname, '../.env');
(0, dotenv_1.config)({ path: envPath });
console.log('[Main] .env 文件路径:', envPath);
console.log('[Main] 环境变量检查：', {
    DB_HOST: process.env.DB_HOST || '未设置',
    DB_PORT: process.env.DB_PORT || '未设置',
    DB_NAME: process.env.DB_NAME || '未设置',
    DB_USERNAME: process.env.DB_USERNAME || '未设置',
    DB_PASSWORD: process.env.DB_PASSWORD ? '已设置' : '未设置',
    NODE_ENV: process.env.NODE_ENV || '未设置',
});
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const allowedOrigins = [
        frontendUrl,
        'http://localhost:3000',
        'https://www.factory-buy.com',
        'https://factory-buy.com',
    ].filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
                callback(null, true);
            }
            else {
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
//# sourceMappingURL=main.js.map