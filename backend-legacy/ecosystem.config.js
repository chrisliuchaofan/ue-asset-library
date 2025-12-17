// PM2 配置文件
// 注意：PM2 不会自动加载 .env 文件，需要在代码中使用 dotenv 加载
// 或者使用 pm2 start ecosystem.config.js --env production
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'ue-assets-backend',
      script: './dist/main.js',
      cwd: '/opt/ue-assets-backend/backend-api',
      instances: 1,
      exec_mode: 'fork',
      // 从 .env 文件加载的环境变量会自动传递给进程
      env: {
        NODE_ENV: 'production',
        // 这些值会从 .env 文件加载（通过上面的 dotenv.config）
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USERNAME: process.env.DB_USERNAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        FRONTEND_URL: process.env.FRONTEND_URL,
        PORT: process.env.PORT || '3001',
        JWT_SECRET: process.env.JWT_SECRET,
        USER_WHITELIST: process.env.USER_WHITELIST,
        INITIAL_CREDITS: process.env.INITIAL_CREDITS,
      },
      error_file: '/root/.pm2/logs/ue-assets-backend-error.log',
      out_file: '/root/.pm2/logs/ue-assets-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    },
  ],
};

