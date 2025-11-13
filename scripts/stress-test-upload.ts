/**
 * 压力测试脚本：测试批量上传功能
 * 
 * 使用方法：
 * 1. 确保服务器正在运行: npm run dev
 * 2. 运行测试: npx tsx scripts/stress-test-upload.ts
 * 
 * 测试场景：
 * - 小批量（10个文件）
 * - 中批量（50个文件）
 * - 大批量（100个文件）
 * - 超大批量（200个文件）
 */

import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 测试配置
const TEST_CONFIG = {
  // 测试文件数量
  SMALL_BATCH: 10,
  MEDIUM_BATCH: 50,
  LARGE_BATCH: 100,
  XL_BATCH: 200,
  
  // 文件大小（字节）
  SMALL_FILE_SIZE: 100 * 1024, // 100KB
  MEDIUM_FILE_SIZE: 1024 * 1024, // 1MB
  LARGE_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  
  // 并发数
  CONCURRENT_UPLOADS: 5,
  
  // API端点
  UPLOAD_API: 'http://localhost:3000/api/upload/batch',
  CREATE_ASSET_API: 'http://localhost:3000/api/assets',
};

// 生成测试文件
async function generateTestFile(size: number, index: number, type: 'image' | 'video'): Promise<File> {
  const buffer = Buffer.alloc(size);
  // 填充一些随机数据
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  const ext = type === 'image' ? '.jpg' : '.mp4';
  const fileName = `test-${type}-${index}${ext}`;
  const mimeType = type === 'image' ? 'image/jpeg' : 'video/mp4';
  
  return new File([buffer], fileName, { type: mimeType });
}

// 创建测试文件目录
async function setupTestFiles() {
  const testDir = join(process.cwd(), 'test-files');
  if (!existsSync(testDir)) {
    await mkdir(testDir, { recursive: true });
  }
  return testDir;
}

// 测试批量上传
async function testBatchUpload(files: File[], batchName: string) {
  console.log(`\n📦 开始测试: ${batchName}`);
  console.log(`   文件数量: ${files.length}`);
  console.log(`   总大小: ${(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);
  
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const startTime = Date.now();
  let success = false;
  let error: Error | null = null;
  
  try {
    const response = await fetch(TEST_CONFIG.UPLOAD_API, {
      method: 'POST',
      body: formData,
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    success = result.success === true && result.files?.length === files.length;
    
    console.log(`   ✅ 上传成功`);
    console.log(`   ⏱️  耗时: ${duration}ms (${(duration / files.length).toFixed(0)}ms/文件)`);
    console.log(`   📊 速度: ${((files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024) / (duration / 1000)).toFixed(2)} MB/s`);
    
    return { success: true, duration, files: result.files };
  } catch (err) {
    const duration = Date.now() - startTime;
    error = err instanceof Error ? err : new Error(String(err));
    console.log(`   ❌ 上传失败: ${error.message}`);
    console.log(`   ⏱️  耗时: ${duration}ms`);
    return { success: false, duration, error: error.message };
  }
}

// 测试并发上传（模拟多个用户同时上传）
async function testConcurrentUploads(batchSize: number, concurrentUsers: number) {
  console.log(`\n🔄 并发测试: ${concurrentUsers} 个用户，每个 ${batchSize} 个文件`);
  
  const files = await Promise.all(
    Array.from({ length: batchSize }, (_, i) => 
      generateTestFile(TEST_CONFIG.MEDIUM_FILE_SIZE, i, i % 2 === 0 ? 'image' : 'video')
    )
  );
  
  const startTime = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: concurrentUsers }, (_, i) => 
      testBatchUpload(files, `并发用户 ${i + 1}`)
    )
  );
  
  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failCount = results.length - successCount;
  
  console.log(`\n📊 并发测试结果:`);
  console.log(`   成功: ${successCount}/${concurrentUsers}`);
  console.log(`   失败: ${failCount}/${concurrentUsers}`);
  console.log(`   总耗时: ${duration}ms`);
  
  return { successCount, failCount, duration };
}

// 内存使用监控（简化版）
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
    };
  }
  return null;
}

// 主测试函数
async function runStressTests() {
  console.log('🚀 开始压力测试...\n');
  console.log('⚠️  请确保开发服务器正在运行: npm run dev\n');
  
  const memoryBefore = getMemoryUsage();
  if (memoryBefore) {
    console.log(`📊 初始内存使用: ${memoryBefore.heapUsed}MB / ${memoryBefore.heapTotal}MB`);
  }
  
  const results: Array<{ test: string; success: boolean; duration: number }> = [];
  
  // 测试1: 小批量
  const smallFiles = await Promise.all(
    Array.from({ length: TEST_CONFIG.SMALL_BATCH }, (_, i) => 
      generateTestFile(TEST_CONFIG.SMALL_FILE_SIZE, i, 'image')
    )
  );
  const smallResult = await testBatchUpload(smallFiles, `小批量 (${TEST_CONFIG.SMALL_BATCH}个文件)`);
  results.push({ test: '小批量', success: smallResult.success, duration: smallResult.duration });
  
  // 等待一下，避免服务器压力过大
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试2: 中批量
  const mediumFiles = await Promise.all(
    Array.from({ length: TEST_CONFIG.MEDIUM_BATCH }, (_, i) => 
      generateTestFile(TEST_CONFIG.MEDIUM_FILE_SIZE, i, i % 2 === 0 ? 'image' : 'video')
    )
  );
  const mediumResult = await testBatchUpload(mediumFiles, `中批量 (${TEST_CONFIG.MEDIUM_BATCH}个文件)`);
  results.push({ test: '中批量', success: mediumResult.success, duration: mediumResult.duration });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试3: 大批量
  const largeFiles = await Promise.all(
    Array.from({ length: TEST_CONFIG.LARGE_BATCH }, (_, i) => 
      generateTestFile(TEST_CONFIG.MEDIUM_FILE_SIZE, i, i % 3 === 0 ? 'video' : 'image')
    )
  );
  const largeResult = await testBatchUpload(largeFiles, `大批量 (${TEST_CONFIG.LARGE_BATCH}个文件)`);
  results.push({ test: '大批量', success: largeResult.success, duration: largeResult.duration });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试4: 并发测试
  const concurrentResult = await testConcurrentUploads(10, 3);
  results.push({ 
    test: '并发测试', 
    success: concurrentResult.failCount === 0, 
    duration: concurrentResult.duration 
  });
  
  const memoryAfter = getMemoryUsage();
  if (memoryAfter) {
    console.log(`\n📊 最终内存使用: ${memoryAfter.heapUsed}MB / ${memoryAfter.heapTotal}MB`);
    console.log(`   内存增长: ${memoryAfter.heapUsed - (memoryBefore?.heapUsed || 0)}MB`);
  }
  
  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📋 测试总结:');
  console.log('='.repeat(60));
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.test.padEnd(15)} ${r.duration}ms`);
  });
  
  const allPassed = results.every(r => r.success);
  if (allPassed) {
    console.log('\n✅ 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，建议检查服务器日志和资源使用情况');
  }
}

// 运行测试
runStressTests().catch(console.error);











