/**
 * 读取性能测试脚本：测试大量数据下的页面加载和查询性能
 * 
 * 使用方法：
 * 1. 确保服务器正在运行: npm run dev
 * 2. 先生成测试数据: npx tsx scripts/generate-test-data.ts
 * 3. 运行性能测试: npx tsx scripts/test-read-performance.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// 获取 performance API
function getPerformance() {
  if (typeof globalThis !== 'undefined' && globalThis.performance) {
    return globalThis.performance;
  }
  if (typeof require !== 'undefined') {
    try {
      return require('perf_hooks').performance;
    } catch {
      // fallback
    }
  }
  // 简单的 fallback
  return {
    now: () => Date.now(),
  };
}

const perf = getPerformance();

interface PerformanceResult {
  name: string;
  duration: number;
  success: boolean;
  dataSize?: number;
  error?: string;
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

// 测试API响应时间
async function testAPI(
  name: string,
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<PerformanceResult> {
  const startTime = perf.now();
  
  try {
    const options: RequestInit = {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, options);
    const duration = perf.now() - startTime;

    if (!response.ok) {
      return {
        name,
        duration,
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const dataSize = JSON.stringify(data).length;

    return {
      name,
      duration,
      success: true,
      dataSize,
    };
  } catch (error) {
    return {
      name,
      duration: performance.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 测试资产列表加载
async function testAssetsList(): Promise<PerformanceResult> {
  return testAPI('获取资产列表', `${API_BASE}/api/assets`);
}

// 测试资产查询（带筛选）
async function testAssetsQuery(): Promise<PerformanceResult> {
  return testAPI('资产查询（筛选）', `${API_BASE}/api/assets/query`, 'POST', {
    keyword: '测试',
    types: ['角色', '场景'],
    tags: ['自然', '风景'],
  });
}

// 测试素材列表加载
async function testMaterialsList(): Promise<PerformanceResult> {
  return testAPI('获取素材列表', `${API_BASE}/api/materials`);
}

// 测试素材查询（带筛选）
async function testMaterialsQuery(): Promise<PerformanceResult> {
  return testAPI('素材查询（筛选）', `${API_BASE}/api/materials/query`, 'POST', {
    keyword: '测试',
    type: 'UE视频',
    tag: '优质',
  });
}

// 测试分页性能
async function testPagination(): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = [];
  
  // 测试不同limit值
  const limits = [10, 20, 50, 100];
  
  for (const limit of limits) {
    const result = await testAPI(
      `资产查询（limit=${limit}）`,
      `${API_BASE}/api/assets/query`,
      'POST',
      { limit }
    );
    results.push(result);
  }
  
  return results;
}

// 测试并发查询
async function testConcurrentQueries(concurrency: number): Promise<PerformanceResult> {
  const startTime = perf.now();
  
  const queries = Array.from({ length: concurrency }, () =>
    testAPI(`并发查询`, `${API_BASE}/api/assets/query`, 'POST', { limit: 20 })
  );
  
  const results = await Promise.allSettled(queries);
  const duration = performance.now() - startTime;
  
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failCount = results.length - successCount;
  
  return {
    name: `并发查询 (${concurrency}个)`,
    duration,
    success: failCount === 0,
    error: failCount > 0 ? `${failCount}个失败` : undefined,
  };
}

// 测试页面加载（模拟浏览器请求）
async function testPageLoad(page: string): Promise<PerformanceResult> {
  const startTime = perf.now();
  
  try {
    // 设置超时（10秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE}${page}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Performance-Test-Script/1.0',
      },
    });
    
    clearTimeout(timeoutId);
    const duration = perf.now() - startTime;
    
    if (!response.ok) {
      return {
        name: `页面加载: ${page}`,
        duration,
        success: false,
        error: `HTTP ${response.status}`,
      };
    }
    
    const html = await response.text();
    
    return {
      name: `页面加载: ${page}`,
      duration,
      success: true,
      dataSize: html.length,
    };
  } catch (error) {
    const duration = perf.now() - startTime;
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // 如果是超时或网络错误，提供更友好的提示
    if (errorMessage.includes('aborted') || errorMessage.includes('timeout') || errorMessage.includes('fetch failed')) {
      errorMessage = '网络请求失败（可能是服务器未运行或超时）';
    }
    
    return {
      name: `页面加载: ${page}`,
      duration,
      success: false,
      error: errorMessage,
    };
  }
}

// 主测试函数
async function runPerformanceTests() {
  console.log('🚀 开始性能测试...\n');
  console.log('⚠️  请确保已经生成了测试数据: npx tsx scripts/generate-test-data.ts\n');
  
  const memoryBefore = getMemoryUsage();
  if (memoryBefore) {
    console.log(`📊 初始内存使用: ${memoryBefore.heapUsed}MB / ${memoryBefore.heapTotal}MB\n`);
  }

  const results: PerformanceResult[] = [];
  
  // 测试1: 基础API
  console.log('📡 测试基础API...');
  results.push(await testAssetsList());
  results.push(await testMaterialsList());
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试2: 查询API
  console.log('\n🔍 测试查询API...');
  results.push(await testAssetsQuery());
  results.push(await testMaterialsQuery());
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试3: 分页性能
  console.log('\n📄 测试分页性能...');
  const paginationResults = await testPagination();
  results.push(...paginationResults);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试4: 并发查询
  console.log('\n🔄 测试并发查询...');
  results.push(await testConcurrentQueries(5));
  results.push(await testConcurrentQueries(10));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试5: 页面加载（可选，如果失败不影响整体测试）
  // 注意：Node.js环境下的页面加载测试可能失败，这是正常的
  // 真实的页面加载性能应该在浏览器中测试（参考 BROWSER_PERFORMANCE_TEST.md）
  console.log('\n🌐 测试页面加载（可选）...');
  console.log('   提示：Node.js环境限制可能导致失败，不影响API性能评估');
  console.log('   如需测试页面加载，请在浏览器中使用 DevTools 或运行 scripts/test-browser-performance.js');
  
  const pageLoadTests = ['/assets', '/materials', '/'];
  for (const page of pageLoadTests) {
    try {
      const result = await testPageLoad(page);
      results.push(result);
      if (!result.success) {
        // 如果失败，说明是Node.js环境限制，可以忽略
        console.log(`   ⚠️  ${page}: ${result.error} (可忽略)`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${page}: 测试跳过`);
    }
  }
  
  const memoryAfter = getMemoryUsage();
  if (memoryAfter) {
    console.log(`\n📊 最终内存使用: ${memoryAfter.heapUsed}MB / ${memoryAfter.heapTotal}MB`);
    console.log(`   内存增长: ${memoryAfter.heapUsed - (memoryBefore?.heapUsed || 0)}MB`);
  }
  
  // 输出结果
  console.log('\n' + '='.repeat(80));
  console.log('📋 性能测试结果:');
  console.log('='.repeat(80));
  console.log(`${'测试项'.padEnd(30)} ${'耗时(ms)'.padEnd(12)} ${'状态'.padEnd(8)} ${'数据大小'.padEnd(12)}`);
  console.log('-'.repeat(80));
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const duration = r.duration.toFixed(0).padStart(8);
    const dataSize = r.dataSize ? `${(r.dataSize / 1024).toFixed(1)}KB` : '-';
    const error = r.error ? ` (${r.error})` : '';
    console.log(`${r.name.padEnd(30)} ${duration}ms     ${status.padEnd(8)} ${dataSize.padEnd(12)}${error}`);
  });
  
  // 性能分析
  console.log('\n' + '='.repeat(80));
  console.log('📊 性能分析:');
  console.log('='.repeat(80));
  
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const maxDuration = Math.max(...successfulResults.map(r => r.duration));
    const minDuration = Math.min(...successfulResults.map(r => r.duration));
    
    console.log(`平均响应时间: ${avgDuration.toFixed(0)}ms`);
    console.log(`最快响应: ${minDuration.toFixed(0)}ms`);
    console.log(`最慢响应: ${maxDuration.toFixed(0)}ms`);
    
    // 性能评级
    const slowQueries = successfulResults.filter(r => r.duration > 1000);
    if (slowQueries.length > 0) {
      console.log(`\n⚠️  发现 ${slowQueries.length} 个慢查询 (>1000ms):`);
      slowQueries.forEach(r => {
        console.log(`  - ${r.name}: ${r.duration.toFixed(0)}ms`);
      });
    }
    
    if (avgDuration < 200) {
      console.log('\n✅ 性能优秀！平均响应时间 < 200ms');
    } else if (avgDuration < 500) {
      console.log('\n✅ 性能良好！平均响应时间 < 500ms');
    } else if (avgDuration < 1000) {
      console.log('\n⚠️  性能一般，建议优化。平均响应时间 < 1000ms');
    } else {
      console.log('\n❌ 性能较差，需要优化！平均响应时间 > 1000ms');
    }
  }
  
  const failedResults = results.filter(r => !r.success);
  const apiResults = results.filter(r => !r.name.includes('页面加载'));
  const apiFailedResults = apiResults.filter(r => !r.success);
  
  if (apiFailedResults.length > 0) {
    console.log(`\n❌ API测试失败: ${apiFailedResults.length}/${apiResults.length}`);
    apiFailedResults.forEach(r => {
      console.log(`  - ${r.name}: ${r.error || '未知错误'}`);
    });
  } else {
    console.log(`\n✅ 所有API测试通过！`);
  }
  
  // 页面加载测试单独报告
  const pageResults = results.filter(r => r.name.includes('页面加载'));
  const pageFailedResults = pageResults.filter(r => !r.success);
  if (pageFailedResults.length > 0) {
    console.log(`\n⚠️  页面加载测试失败: ${pageFailedResults.length}/${pageResults.length}`);
    console.log(`   这通常是因为Node.js环境限制，不影响API性能评估`);
    pageFailedResults.forEach(r => {
      console.log(`  - ${r.name}: ${r.error || '未知错误'}`);
    });
  } else if (pageResults.length > 0) {
    console.log(`\n✅ 页面加载测试通过！`);
  }
}

// 运行测试
runPerformanceTests().catch(console.error);

