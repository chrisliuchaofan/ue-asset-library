/**
 * 检查当前生效的环境变量
 * 
 * 使用方法：
 * npx tsx scripts/check-env.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 检查环境变量配置...\n');

// Next.js 会按优先级加载环境变量文件
// 优先级：.env.local > .env.development > .env
const envFiles = [
  '.env.local',
  '.env.development',
  '.env',
];

console.log('1️⃣ 检查哪些环境变量文件存在:');
const existingFiles: string[] = [];
for (const file of envFiles) {
  try {
    const content = readFileSync(join(process.cwd(), file), 'utf-8');
    existingFiles.push(file);
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`   ✅ ${file} (${lines.length} 个配置项)`);
  } catch (error) {
    // 文件不存在，忽略
  }
}

if (existingFiles.length === 0) {
  console.log('   ⚠️  没有找到任何环境变量文件');
  console.log('   建议创建 .env.local 文件');
}

console.log('\n2️⃣ 检查 Supabase 相关环境变量（当前进程中的值）:');
console.log('   注意：这些是实际生效的值（可能来自 .env.local 或其他来源）\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl) {
  console.log(`   ✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 40)}...`);
  console.log(`      完整值: ${supabaseUrl}`);
} else {
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_URL: 未设置');
}

if (supabaseAnonKey) {
  console.log(`   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`      完整值: ${supabaseAnonKey}`);
} else {
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: 未设置');
}

console.log('\n3️⃣ 检查 .env.local 文件内容（如果存在）:');
try {
  const envLocalPath = join(process.cwd(), '.env.local');
  const content = readFileSync(envLocalPath, 'utf-8');
  const lines = content.split('\n');
  
  let hasSupabaseUrl = false;
  let hasSupabaseKey = false;
  
  lines.forEach((line, index) => {
    if (line.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      hasSupabaseUrl = true;
      console.log(`   第 ${index + 1} 行: ${line.trim()}`);
    }
    if (line.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
      hasSupabaseKey = true;
      console.log(`   第 ${index + 1} 行: ${line.trim()}`);
    }
  });
  
  if (!hasSupabaseUrl) {
    console.log('   ⚠️  .env.local 中没有找到 NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!hasSupabaseKey) {
    console.log('   ⚠️  .env.local 中没有找到 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  if (hasSupabaseUrl && hasSupabaseKey) {
    console.log('   ✅ .env.local 包含 Supabase 配置');
  }
} catch (error) {
  console.log('   ⚠️  无法读取 .env.local 文件');
}

console.log('\n4️⃣ 总结:');
if (supabaseUrl && supabaseAnonKey) {
  console.log('   ✅ Supabase 环境变量已配置并生效');
  console.log('   📝 当前使用的配置文件: .env.local（优先级最高）');
  console.log('\n   下一步: 运行 npm run check:supabase 测试连接');
} else {
  console.log('   ❌ Supabase 环境变量未配置');
  console.log('\n   需要做的:');
  console.log('   1. 在 .env.local 文件中添加:');
  console.log('      NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.log('   2. 重启开发服务器 (npm run dev)');
}




