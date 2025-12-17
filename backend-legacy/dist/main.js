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
    const additionalOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const allowedOrigins = [
        frontendUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://www.factory-buy.com',
        'https://factory-buy.com',
        ...additionalOrigins,
    ].filter(Boolean);
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
            if (isDevelopment) {
                console.log('[CORS] 开发模式：允许所有来源:', origin || '无 origin（如 Postman/curl）');
                return callback(null, true);
            }
            if (!origin) {
                console.log('[CORS] 允许无 origin 的请求（如 Postman/curl）');
                return callback(null, true);
            }
            const isAllowed = allowedOrigins.some(allowed => {
                if (allowed.includes('*')) {
                    const pattern = allowed.replace(/\*/g, '.*');
                    const regex = new RegExp(`^${pattern}$`);
                    return regex.test(origin);
                }
                return origin === allowed || origin.startsWith(allowed);
            });
            if (isAllowed) {
                console.log('[CORS] ✅ 允许来源:', origin);
                callback(null, true);
            }
            else {
                console.warn('[CORS] ❌ 拒绝来源:', origin, '（不在允许列表中）');
                console.warn('[CORS] 当前允许的域名:', allowedOrigins);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    });
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_HTTPS_DISABLED) {
        app.use((req, res, next) => {
            const forwardedProto = req.headers['x-forwarded-proto'];
            const host = req.headers.host;
            if (forwardedProto !== 'https' && host && (host.includes('api.') || host.includes('your-domain.com'))) {
                console.warn('[Main] ⚠️ 检测到 HTTP 请求，重定向到 HTTPS:', { host, url: req.url });
                return res.redirect(301, `https://${host}${req.url}`);
            }
            next();
        });
    }
    const port = parseInt(process.env.PORT || '3001', 10);
    if (port !== 3001) {
        console.warn(`[Main] ⚠️  警告：端口被设置为 ${port}，但本地开发环境应该使用 3001`);
        console.warn(`[Main] 如果这是有意的，请忽略此警告。否则请检查环境变量 PORT`);
    }
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
//# sourceMappingURL=main.js.map