/**
 * 检查登录配置和连接
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 检查登录配置...\n');

// 加载 .env.local
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
}

// 检查配置
const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;
const adminUsers = process.env.ADMIN_USERS;

console.log('📋 配置检查:');
console.log(`  后端 URL: ${backendUrl}`);
console.log(`  NEXTAUTH_SECRET: ${nextAuthSecret ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`  NEXTAUTH_URL: ${nextAuthUrl || '未设置（默认使用当前域名）'}`);
console.log(`  ADMIN_USERS: ${adminUsers || '未设置（使用默认 admin/admin123）'}\n`);

// 测试后端连接
console.log('🔗 测试后端连接...');
try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  const response = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@test.local',
      password: 'test',
    }),
    signal: controller.signal,
  });
  
  clearTimeout(timeoutId);
  
  console.log(`  状态码: ${response.status}`);
  console.log(`  状态文本: ${response.statusText}`);
  
  if (response.status === 401) {
    console.log('  ✅ 后端服务正常运行（401 是预期的，因为测试账号不存在）\n');
  } else if (response.ok) {
    console.log('  ✅ 后端服务正常运行\n');
  } else {
    console.log(`  ⚠️  后端返回错误: ${response.status} ${response.statusText}\n`);
  }
} catch (error: any) {
  if (error.name === 'AbortError') {
    console.log('  ❌ 后端连接超时（5秒）\n');
    console.log('  可能原因：');
    console.log('    1. 后端服务未运行');
    console.log('    2. 后端 URL 配置错误');
    console.log('    3. 网络连接问题\n');
  } else if (error.message.includes('ECONNREFUSED')) {
    console.log('  ❌ 后端连接被拒绝\n');
    console.log('  可能原因：');
    console.log('    1. 后端服务未运行');
    console.log('    2. 后端端口不正确（默认是 3001）\n');
  } else {
    console.log(`  ❌ 后端连接失败: ${error.message}\n`);
  }
  
  console.log('💡 解决方案：');
  console.log('  1. 启动后端服务：');
  console.log('     cd backend-api');
  console.log('     npm start');
  console.log('');
  console.log('  2. 或者修改后端 URL（在 .env.local 中）：');
  console.log('     BACKEND_API_URL=http://your-backend-url');
  console.log('');
}

// 显示可用的账号
console.log('📝 可用的登录账号：');
if (adminUsers) {
  adminUsers.split(',').forEach((user, index) => {
    const [username, password] = user.split(':');
    console.log(`  ${index + 1}. ${username.trim()} / ${password.trim()}`);
  });
} else {
  const defaultPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
  console.log(`  1. admin / ${defaultPassword}`);
}
console.log('');






