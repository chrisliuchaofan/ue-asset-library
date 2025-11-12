/**
 * 快速测试脚本：验证修复是否有效
 * 
 * 使用方法：
 * 1. 确保服务器正在运行: npm run dev
 * 2. 运行: npx tsx scripts/quick-test.ts
 */

// 使文件成为模块，避免全局作用域冲突
export {};

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// 测试创建单个资产
async function testCreateAsset() {
  const testAsset = {
    name: '测试资产_快速验证',
    type: '角色',
    style: '写实',
    tags: ['测试'],
    source: '内部',
    engineVersion: 'UE5.5',
    guangzhouNas: '/nas/guangzhou/test/quick_test.jpg',
    shenzhenNas: '/nas/shenzhen/test/quick_test.jpg',
    thumbnail: '/demo/test_thumb.jpg',
    src: '/demo/test.jpg',
    gallery: ['/demo/test_1.jpg', '/demo/test_2.jpg'], // 数组格式
  };

  try {
    const response = await fetch(`${API_BASE}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAsset),
    });

    if (response.ok) {
      console.log('✅ 资产创建测试通过');
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ 资产创建失败: HTTP ${response.status}`);
      console.log(`   错误: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 资产创建失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// 测试创建单个素材
async function testCreateMaterial() {
  const testMaterial = {
    name: '测试素材_快速验证',
    type: 'UE视频' as const,
    tag: '达标' as const,
    quality: ['常规'] as ('常规')[],
    thumbnail: '/demo/test_material_thumb.jpg',
    src: '/demo/test_material.mp4',
    gallery: ['/demo/test_material_1.jpg', '/demo/test_material_2.jpg'], // 数组格式
  };

  try {
    const response = await fetch(`${API_BASE}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMaterial),
    });

    if (response.ok) {
      console.log('✅ 素材创建测试通过');
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ 素材创建失败: HTTP ${response.status}`);
      console.log(`   错误: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 素材创建失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 快速验证测试...\n');
  console.log('⚠️  请确保服务器正在运行: npm run dev\n');

  const assetResult = await testCreateAsset();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const materialResult = await testCreateMaterial();

  console.log('\n' + '='.repeat(60));
  if (assetResult && materialResult) {
    console.log('✅ 所有测试通过！可以运行完整测试了：');
    console.log('   npx tsx scripts/generate-test-data.ts');
  } else {
    console.log('❌ 部分测试失败，请检查错误信息');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);

