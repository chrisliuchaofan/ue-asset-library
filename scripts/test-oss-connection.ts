#!/usr/bin/env tsx
/**
 * 测试 OSS 连接和读取 manifest.json
 */

// 手动加载 .env.local 文件（因为脚本运行时 Next.js 还没有加载环境变量）
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvLocal() {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('无法读取 .env.local 文件:', error);
  }
}

// 先加载环境变量
loadEnvLocal();

import { getOSSClient } from '../lib/oss-client';
import { getStorageMode } from '../lib/storage';

async function testOSSConnection() {
  console.log('🔍 开始测试 OSS 连接...\n');

  // 1. 检查存储模式
  console.log('📋 步骤 1: 检查存储模式');
  const storageMode = getStorageMode();
  console.log(`   存储模式: ${storageMode}`);
  
  if (storageMode !== 'oss') {
    console.error('❌ 存储模式不是 OSS，当前模式:', storageMode);
    console.log('   请检查 .env.local 中的 STORAGE_MODE 配置');
    return;
  }
  console.log('✅ 存储模式正确\n');

  // 2. 检查 OSS 配置
  console.log('📋 步骤 2: 检查 OSS 配置');
  try {
    const client = getOSSClient();
    console.log('✅ OSS 客户端创建成功');
    console.log(`   Bucket: ${process.env.OSS_BUCKET}`);
    console.log(`   Region: ${process.env.OSS_REGION}`);
    console.log();
  } catch (error: any) {
    console.error('❌ OSS 客户端创建失败:', error.message);
    console.log('   请检查 .env.local 中的 OSS 配置');
    return;
  }

  // 3. 测试读取 manifest.json
  console.log('📋 步骤 3: 测试读取 manifest.json');
  try {
    const client = getOSSClient();
    const result = await client.get('manifest.json');
    const data = JSON.parse(result.content.toString('utf-8'));
    const assetCount = data.assets?.length || 0;
    
    console.log('✅ manifest.json 读取成功');
    console.log(`   资产数量: ${assetCount}`);
    
    if (assetCount > 0) {
      console.log('   前 3 个资产:');
      data.assets.slice(0, 3).forEach((asset: any, i: number) => {
        console.log(`     ${i + 1}. ${asset.name} (${asset.type})`);
      });
    } else {
      console.log('   ⚠️  OSS 中的 manifest.json 是空的');
    }
    console.log();
  } catch (error: any) {
    if (error.code === 'NoSuchKey' || error.status === 404) {
      console.log('⚠️  manifest.json 不存在（OSS 中还没有数据）');
      console.log('   这是正常的，首次使用时需要先上传资产');
    } else {
      console.error('❌ 读取 manifest.json 失败:', error.message);
      console.error('   错误详情:', error);
    }
    console.log();
  }

  // 4. 测试列出 assets 目录
  console.log('📋 步骤 4: 测试列出 assets/ 目录');
  try {
    const client = getOSSClient();
    const listResult = await client.list({
      prefix: 'assets/',
      'max-keys': 5,
    });
    const fileCount = listResult.objects?.length || 0;
    
    console.log('✅ assets/ 目录访问成功');
    console.log(`   文件数量（前5个）: ${fileCount}`);
    
    if (fileCount > 0) {
      console.log('   前 3 个文件:');
      listResult.objects?.slice(0, 3).forEach((obj: any, i: number) => {
        const sizeMB = (obj.size / 1024 / 1024).toFixed(2);
        console.log(`     ${i + 1}. ${obj.name} (${sizeMB} MB)`);
      });
    }
    console.log();
  } catch (error: any) {
    console.error('❌ 列出文件失败:', error.message);
    console.log();
  }

  console.log('='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  console.log('✅ 存储模式: OSS');
  console.log('✅ OSS 配置: 正确');
  console.log('💡 如果看不到资产，可能的原因：');
  console.log('   1. 开发服务器没有重启（需要重启才能加载新配置）');
  console.log('   2. 浏览器缓存（尝试硬刷新 Ctrl+Shift+R 或 Cmd+Shift+R）');
  console.log('   3. Next.js 缓存（尝试删除 .next 目录后重启）');
}

testOSSConnection().catch(console.error);

