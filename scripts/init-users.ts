/**
 * 初始化测试用户脚本
 * 
 * 用途：通过 Supabase Admin API 创建用户并设置积分
 * 
 * 使用方法：
 * 1. 确保已配置 SUPABASE_SERVICE_ROLE_KEY 环境变量（在 .env.local 中）
 * 2. 运行：npx tsx scripts/init-users.ts
 */

// 手动加载 .env.local 文件（必须在导入 supabaseAdmin 之前）
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 检查环境变量配置...\n');

// 加载 .env.local 文件
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  console.log(`✅ 找到 .env.local 文件: ${envPath}`);
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    let loadedCount = 0;
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          const keyTrimmed = key.trim();
          if (!process.env[keyTrimmed]) {
            process.env[keyTrimmed] = value;
            loadedCount++;
          }
        }
      }
    });
    console.log(`✅ 已加载 ${loadedCount} 个环境变量\n`);
  } catch (error: any) {
    console.warn(`⚠️  读取 .env.local 文件失败: ${error.message}\n`);
  }
} else {
  console.warn(`⚠️  未找到 .env.local 文件: ${envPath}`);
  console.warn('   将使用系统环境变量\n');
}

// 验证必需的环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 环境变量检查:');
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? '✅ 已设置' : '❌ 未设置'}\n`);

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ 错误：缺少必需的环境变量！');
  console.error('');
  console.error('请在 .env.local 文件中配置以下变量：');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=你的 Supabase URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=你的 Service Role Key');
  console.error('');
  console.error('获取方式：');
  console.error('  1. 登录 Supabase Dashboard: https://app.supabase.com');
  console.error('  2. 选择你的项目');
  console.error('  3. 进入 Project Settings > API');
  console.error('  4. 复制 Project URL 和 service_role key（不是 anon key）');
  console.error('');
  console.error('或者通过环境变量设置：');
  console.error('  export NEXT_PUBLIC_SUPABASE_URL="你的 URL"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="你的 Key"');
  console.error('');
  process.exit(1);
}

// 延迟导入 supabaseAdmin（在环境变量设置之后）
// 注意：由于需要在环境变量设置后导入，我们需要在函数内部导入
let supabaseAdmin: any;

interface UserConfig {
  email: string;
  password: string;
  credits: number;
}

const testUsers: UserConfig[] = [
  {
    email: 'admin@admin.local',
    password: 'admin123',
    credits: 1000,
  },
  {
    email: 'test1@admin.local',
    password: 'test123',
    credits: 500,
  },
  {
    email: 'test2@admin.local',
    password: 'test123',
    credits: 200,
  },
];

async function createUser(userConfig: UserConfig) {
  try {
    console.log(`\n📝 创建用户: ${userConfig.email}`);

    // 1. 使用 Supabase Admin API 创建 Auth 用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userConfig.email,
      password: userConfig.password,
      email_confirm: true, // 自动确认邮箱
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`  ⚠️  用户已存在，跳过创建`);
      } else {
        throw authError;
      }
    } else {
      console.log(`  ✅ Auth 用户创建成功: ${authData.user?.id}`);
    }

    // 2. 获取用户 ID（如果已存在，需要查询）
    let userId: string;
    if (authData?.user?.id) {
      userId = authData.user.id;
    } else {
      // 用户已存在，查询用户 ID
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const user = existingUser?.users.find(u => u.email === userConfig.email);
      if (!user) {
        throw new Error(`无法找到用户: ${userConfig.email}`);
      }
      userId = user.id;
      console.log(`  ℹ️  使用现有用户 ID: ${userId}`);
    }

    // 3. 创建或更新 profiles 记录
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: userConfig.email,
        credits: userConfig.credits,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    console.log(`  ✅ Profile 创建/更新成功，积分: ${profileData.credits}`);
    return { success: true, userId, email: userConfig.email };
  } catch (error: any) {
    console.error(`  ❌ 创建用户失败:`, error.message);
    return { success: false, error: error.message, email: userConfig.email };
  }
}

async function main() {
  // 在函数内部导入 supabaseAdmin（确保环境变量已设置）
  const adminModule = await import('../lib/supabase/admin');
  supabaseAdmin = adminModule.supabaseAdmin;
  
  console.log('🚀 开始初始化测试用户...\n');
  
  // 测试连接
  console.log('🔗 测试 Supabase 连接...');
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('count').limit(1);
    if (error) {
      console.error(`❌ 连接失败: ${error.message}`);
      process.exit(1);
    }
    console.log('✅ Supabase 连接成功\n');
  } catch (error: any) {
    console.error(`❌ 连接失败: ${error.message}`);
    process.exit(1);
  }

  const results = [];
  for (const userConfig of testUsers) {
    const result = await createUser(userConfig);
    results.push(result);
    
    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 执行结果汇总:');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${failCount}`);

  if (failCount > 0) {
    console.log('\n失败详情:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.email}: ${r.error}`);
    });
  }

  // 查询所有用户
  console.log('\n📋 当前所有用户:');
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, credits, created_at')
    .order('created_at', { ascending: false });

  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`  - ${p.email}: ${p.credits} 积分 (ID: ${p.id})`);
    });
  } else {
    console.log('  (暂无用户)');
  }
}

main().catch(console.error);

