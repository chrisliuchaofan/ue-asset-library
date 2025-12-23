/**
 * Supabase 连接检查脚本
 * 
 * 使用方法：
 * npx tsx scripts/check-supabase.ts
 * 
 * 或者：
 * npm run check:supabase (需要在 package.json 中添加脚本)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';

async function checkSupabase() {
  console.log('🔍 开始检查 Supabase 配置...\n');

  // 1. 检查环境变量
  console.log('1️⃣ 检查环境变量:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL 未配置');
    console.log('   请在 .env.local 中添加: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    return;
  } else {
    console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
  }

  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置');
    console.log('   请在 .env.local 中添加: NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    return;
  } else {
    console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  }

  console.log('\n2️⃣ 测试 Supabase 连接:');
  try {
    const supabase = await createServerSupabaseClient();
    console.log('✅ Supabase client 创建成功');

    // 3. 检查 assets 表是否存在
    console.log('\n3️⃣ 检查 assets 表:');
    const { data, error, count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ 查询 assets 表失败:', error.message);
      console.log('\n可能的原因:');
      console.log('  1. assets 表不存在');
      console.log('  2. 表名拼写错误（应该是 "assets"）');
      console.log('  3. RLS (Row Level Security) 策略阻止了访问');
      console.log('  4. API Key 权限不足');
      return;
    }

    console.log(`✅ assets 表存在，当前记录数: ${count ?? 0}`);

    // 4. 获取一条示例数据查看字段结构
    console.log('\n4️⃣ 检查表结构（获取第一条记录）:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ 获取示例数据失败:', sampleError.message);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('✅ 找到示例数据，字段列表:');
      const fields = Object.keys(sampleData[0]);
      fields.forEach((field) => {
        const value = sampleData[0][field];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const preview = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`   - ${field}: ${type} = ${JSON.stringify(preview)}`);
      });

      // 检查关键字段
      console.log('\n5️⃣ 检查关键字段映射:');
      const requiredFields = ['id', 'name', 'type', 'thumbnail', 'src'];
      const optionalFields = ['tags', 'style', 'description', 'source', 'engineVersion', 'project'];
      
      const row = sampleData[0];
      const missingRequired: string[] = [];
      const missingOptional: string[] = [];

      requiredFields.forEach((field) => {
        if (!(field in row)) {
          missingRequired.push(field);
        }
      });

      optionalFields.forEach((field) => {
        if (!(field in row) && !(field.toLowerCase() in row) && !(field.replace(/([A-Z])/g, '_$1').toLowerCase() in row)) {
          missingOptional.push(field);
        }
      });

      if (missingRequired.length > 0) {
        console.error('❌ 缺少必需字段:', missingRequired.join(', '));
        console.log('   这些字段是资产页面必需的，请确保数据库表包含这些字段');
      } else {
        console.log('✅ 所有必需字段都存在');
      }

      if (missingOptional.length > 0) {
        console.log('⚠️  缺少可选字段（不影响基本功能）:', missingOptional.join(', '));
      } else {
        console.log('✅ 所有可选字段都存在');
      }

      // 检查字段名变体
      console.log('\n6️⃣ 检查字段名变体（用于字段映射）:');
      const fieldVariants: Record<string, string[]> = {
        name: ['name', 'title'],
        thumbnail: ['thumbnail', 'thumbnail_url', 'imgUrl', 'thumb', 'cover', 'cover_url'],
        src: ['src', 'file_url', 'url', 'source_url'],
        engineVersion: ['engineVersion', 'engine_version', 'version'],
      };

      Object.entries(fieldVariants).forEach(([targetField, variants]) => {
        const found = variants.find((v) => v in row || v.toLowerCase() in row);
        if (found) {
          console.log(`   ✅ ${targetField}: 找到字段 "${found}"`);
        } else {
          console.log(`   ⚠️  ${targetField}: 未找到任何变体字段`);
        }
      });

    } else {
      console.log('⚠️  表中没有数据');
      console.log('   这是正常的，如果这是新表的话');
      console.log('   字段映射会在有数据时自动适配');
    }

    // 5. 测试完整查询（模拟页面查询）
    console.log('\n7️⃣ 测试完整查询（模拟页面查询）:');
    const { data: allAssets, error: queryError } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (queryError) {
      console.error('❌ 查询失败:', queryError.message);
      return;
    }

    console.log(`✅ 查询成功，返回 ${allAssets?.length ?? 0} 条记录`);
    if (allAssets && allAssets.length > 0) {
      console.log('   示例记录 ID:', allAssets[0].id);
    }

    console.log('\n✅ 所有检查通过！Supabase 配置正确，可以正常使用。');
    console.log('\n📝 下一步:');
    console.log('   1. 访问 http://localhost:3000/assets 查看资产页面');
    console.log('   2. 如果页面显示为空，说明表中没有数据，这是正常的');
    console.log('   3. 如果页面报错，请检查浏览器控制台和服务器日志');

  } catch (error: any) {
    console.error('\n❌ 检查过程中出错:');
    console.error(error.message);
    if (error.stack) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }
  }
}

// 运行检查
checkSupabase()
  .then(() => {
    console.log('\n✨ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 检查失败:', error);
    process.exit(1);
  });






