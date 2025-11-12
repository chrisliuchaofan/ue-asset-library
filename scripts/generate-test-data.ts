/**
 * 生成测试数据脚本：批量创建资产和素材
 * 
 * 使用方法：
 * 1. 确保服务器正在运行: npm run dev
 * 2. 运行脚本: npx tsx scripts/generate-test-data.ts
 * 
 * 参数：
 * --assets=数量    生成指定数量的资产（默认200）
 * --materials=数量 生成指定数量的素材（默认100）
 * --clear          先清空现有数据
 */

import { createHash } from 'crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

interface TestAsset {
  name: string;
  type: string;
  style: string;
  tags: string[];
  source: string;
  engineVersion: string;
  guangzhouNas: string;
  shenzhenNas: string;
  thumbnail?: string;
  src?: string;
  gallery?: string[]; // 修复：应该是数组
}

interface TestMaterial {
  name: string;
  type: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片';
  tag: '爆款' | '优质' | '达标';
  quality: ('高品质' | '常规' | '迭代')[];
  thumbnail?: string;
  src?: string;
  gallery?: string[]; // 修复：应该是数组
}

// 生成随机字符串
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// 生成测试资产数据
function generateTestAsset(index: number): TestAsset {
  const types = ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'];
  const styles = ['写实', '二次元', '卡通', '国风', '欧式', '科幻'];
  const tags = ['自然', '风景', '建筑', '人物', '动物', '植物', '科技', '艺术', '抽象', '写实'];
  const sources = ['内部', '外部', '网络'];
  const versions = ['UE5.6', 'UE5.5', 'UE5.4', 'UE5.3', 'UE4.3'];

  const type = types[index % types.length];
  const styleCount = Math.floor(Math.random() * 3) + 1;
  const tagCount = Math.floor(Math.random() * 4) + 1;
  
  return {
    name: `测试资产_${index}_${randomString(6)}`,
    type,
    style: Array.from({ length: styleCount }, () => styles[Math.floor(Math.random() * styles.length)]).join(','),
    tags: Array.from({ length: tagCount }, () => tags[Math.floor(Math.random() * tags.length)]),
    source: sources[Math.floor(Math.random() * sources.length)],
    engineVersion: versions[Math.floor(Math.random() * versions.length)],
    guangzhouNas: `/nas/guangzhou/test/asset_${index}.jpg`,
    shenzhenNas: `/nas/shenzhen/test/asset_${index}.jpg`,
    thumbnail: `/demo/test_thumb_${index}.jpg`,
    src: `/demo/test_${index}.jpg`,
    gallery: [`/demo/test_${index}_1.jpg`, `/demo/test_${index}_2.jpg`],
  };
}

// 生成测试素材数据
function generateTestMaterial(index: number): TestMaterial {
  const types: TestMaterial['type'][] = ['UE视频', 'AE视频', '混剪', 'AI视频', '图片'];
  const tags: TestMaterial['tag'][] = ['爆款', '优质', '达标'];
  const qualities: TestMaterial['quality'][0][] = ['高品质', '常规', '迭代'];
  
  const qualityCount = Math.floor(Math.random() * 2) + 1;
  
  return {
    name: `测试素材_${index}_${randomString(6)}`,
    type: types[index % types.length],
    tag: tags[Math.floor(Math.random() * tags.length)],
    quality: Array.from({ length: qualityCount }, () => 
      qualities[Math.floor(Math.random() * qualities.length)]
    ) as TestMaterial['quality'],
    thumbnail: `/demo/test_material_thumb_${index}.jpg`,
    src: `/demo/test_material_${index}.mp4`,
    gallery: [`/demo/test_material_${index}_1.jpg`, `/demo/test_material_${index}_2.jpg`],
  };
}

// 创建资产
async function createAsset(asset: TestAsset): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 创建素材
async function createMaterial(material: TestMaterial): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(material),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 批量创建（带并发控制）
async function batchCreate<T>(
  items: T[],
  createFn: (item: T) => Promise<{ success: boolean; error?: string }>,
  typeName: string,
  concurrency = 5
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      if (index >= items.length) break;

      const item = items[index];
      const result = await createFn(item);
      
      if (result.success) {
        success++;
        if ((index + 1) % 10 === 0) {
          process.stdout.write(`\r创建${typeName}: ${index + 1}/${items.length} (成功: ${success}, 失败: ${failed})`);
        }
      } else {
        failed++;
        errors.push(`索引 ${index}: ${result.error || '未知错误'}`);
      }
    }
  });

  await Promise.all(workers);
  return { success, failed, errors };
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  let assetCount = 200;
  let materialCount = 100;
  let clearData = false;

  // 解析参数
  args.forEach(arg => {
    if (arg.startsWith('--assets=')) {
      assetCount = parseInt(arg.split('=')[1]) || 200;
    } else if (arg.startsWith('--materials=')) {
      materialCount = parseInt(arg.split('=')[1]) || 100;
    } else if (arg === '--clear') {
      clearData = true;
    }
  });

  console.log('🚀 开始生成测试数据...\n');
  console.log(`配置:`);
  console.log(`  资产数量: ${assetCount}`);
  console.log(`  素材数量: ${materialCount}`);
  console.log(`  清空数据: ${clearData ? '是' : '否'}\n`);

  if (clearData) {
    console.log('⚠️  注意：清空数据功能需要手动实现或通过管理界面操作\n');
  }

  const startTime = Date.now();

  // 生成资产
  if (assetCount > 0) {
    console.log(`\n📦 生成 ${assetCount} 个资产...`);
    const assets = Array.from({ length: assetCount }, (_, i) => generateTestAsset(i));
    const assetResults = await batchCreate(assets, createAsset, '资产', 5);
    console.log(`\n✅ 资产创建完成: 成功 ${assetResults.success}, 失败 ${assetResults.failed}`);
    if (assetResults.errors.length > 0 && assetResults.errors.length <= 10) {
      console.log('错误详情:');
      assetResults.errors.forEach(err => console.log(`  - ${err}`));
    } else if (assetResults.errors.length > 10) {
      console.log(`错误详情: (显示前10个)`);
      assetResults.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    }
  }

  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 生成素材
  if (materialCount > 0) {
    console.log(`\n📦 生成 ${materialCount} 个素材...`);
    const materials = Array.from({ length: materialCount }, (_, i) => generateTestMaterial(i));
    const materialResults = await batchCreate(materials, createMaterial, '素材', 5);
    console.log(`\n✅ 素材创建完成: 成功 ${materialResults.success}, 失败 ${materialResults.failed}`);
    if (materialResults.errors.length > 0 && materialResults.errors.length <= 10) {
      console.log('错误详情:');
      materialResults.errors.forEach(err => console.log(`  - ${err}`));
    } else if (materialResults.errors.length > 10) {
      console.log(`错误详情: (显示前10个)`);
      materialResults.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    }
  }

  const duration = Date.now() - startTime;
  console.log(`\n✅ 测试数据生成完成！总耗时: ${(duration / 1000).toFixed(2)}秒`);
  console.log(`\n现在可以运行性能测试脚本了:`);
  console.log(`  npx tsx scripts/test-read-performance.ts`);
}

main().catch(console.error);

