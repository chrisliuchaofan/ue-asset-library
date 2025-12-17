/**
 * 查看当前配置的用户账号
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 检查用户配置...\n');

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

// 检查 ADMIN_USERS
const adminUsers = process.env.ADMIN_USERS || '';
const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

console.log('📋 当前配置的用户账号：\n');

if (adminUsers) {
  console.log('✅ 从 ADMIN_USERS 环境变量读取：');
  adminUsers.split(',').forEach((user, index) => {
    const [username, password] = user.split(':');
    const email = username.includes('@') ? username : `${username}@admin.local`;
    console.log(`  ${index + 1}. 用户名: ${username.trim()}`);
    console.log(`     邮箱: ${email}`);
    console.log(`     密码: ${password.trim()}`);
    console.log('');
  });
} else {
  console.log('⚠️  未配置 ADMIN_USERS，使用默认账号：');
  console.log(`  用户名: admin`);
  console.log(`  邮箱: admin@admin.local`);
  console.log(`  密码: ${adminPassword}`);
  console.log('');
}

console.log('📝 脚本中定义的测试用户（如果已运行 init-users.ts）：');
console.log('  1. admin@admin.local / admin123');
console.log('  2. test1@admin.local / test123');
console.log('  3. test2@admin.local / test123');
console.log('');

console.log('💡 提示：');
console.log('  - 登录系统使用：环境变量中配置的用户');
console.log('  - 测试生成 API：使用脚本创建的用户（需要 userId）');
console.log('  - 查看数据库用户：在 Supabase Dashboard 执行 SQL');
console.log('    SELECT id, email, credits FROM profiles ORDER BY created_at DESC;');




