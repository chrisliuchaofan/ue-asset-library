/**
 * 测试 StorageService
 * 用于验证 OSS 配置和上传功能
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, '.env.local') });

async function testStorageService() {
  console.log('🧪 测试 StorageService');
  console.log('==================================================\n');

  // 检查环境变量
  console.log('📋 检查环境变量:');
  const requiredVars = ['OSS_BUCKET', 'OSS_REGION', 'OSS_ACCESS_KEY', 'OSS_SECRET'];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`  ❌ ${varName}: 未设置`);
    } else {
      console.log(`  ✅ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '已设置' : value}`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ 缺少必需的环境变量: ${missingVars.join(', ')}`);
    console.log('请检查 .env 文件');
    return;
  }

  console.log('\n📋 检查 OSS 配置:');
  try {
    // 动态导入 StorageService（需要编译后的代码）
    const { StorageService } = require('./dist/storage/storage.service');
    const { getRepositoryToken } = require('@nestjs/typeorm');
    
    // 创建模拟的 Repository
    const mockRepository = {
      create: (data: any) => data,
      save: async (data: any) => {
        console.log('  ✅ 数据库保存成功（模拟）');
        return { ...data, id: 'test-id', createdAt: new Date() };
      },
      find: async () => [],
    };

    // 注意：这里只是测试配置，不测试完整功能
    console.log('  ✅ StorageService 可以加载');
    console.log('  ⚠️  完整功能测试需要运行完整的 NestJS 应用');
  } catch (error: any) {
    console.error('  ❌ StorageService 加载失败:', error.message);
    console.log('  💡 提示: 请先运行 npm run build');
  }

  console.log('\n==================================================');
  console.log('测试完成');
  console.log('\n💡 下一步:');
  console.log('  1. 确保后端服务已启动');
  console.log('  2. 使用 Postman 或 curl 测试 /ai/generate-image 接口');
  console.log('  3. 检查 OSS 中是否有文件');
  console.log('  4. 检查数据库 job_outputs 表');
}

testStorageService().catch(console.error);

