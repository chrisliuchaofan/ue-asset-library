/**
 * 环境变量校验脚本
 * 
 * 【输入】：
 * - 从 process.env 读取环境变量（Next.js 会自动加载 .env.local, .env.development, .env）
 * 
 * 【输出】：
 * - 控制台输出：详细的校验结果，包括缺失变量、格式错误、不一致变量
 * - JSON 格式：校验结果摘要（可选）
 * 
 * 【失败提示】：
 * - 明确指出哪些变量缺失
 * - 明确指出哪些变量格式错误
 * - 明确指出哪些变量不一致
 * - 提供修复建议
 * 
 * 【运行方法】：
 * - npm run check:env
 * - 或：tsx scripts/check-env.ts
 */

interface ValidationResult {
  variable: string;
  status: 'ok' | 'missing' | 'format-error' | 'inconsistent';
  message: string;
  required: boolean;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
}

const results: ValidationResult[] = [];

// 检查变量是否存在
function checkExists(name: string, required: boolean = true): boolean {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    if (required) {
      results.push({
        variable: name,
        status: 'missing',
        message: `变量 ${name} 未设置`,
        required: true,
      });
    }
    return false;
  }
  return true;
}

// 检查变量格式
function checkFormat(name: string, validator: (value: string) => boolean, errorMessage: string): boolean {
  const value = process.env[name];
  if (!value) return false;
  
  if (!validator(value)) {
    results.push({
      variable: name,
      status: 'format-error',
      message: errorMessage,
      required: true,
    });
    return false;
  }
  return true;
}

// 检查两个变量是否一致
function checkConsistency(name1: string, name2: string): boolean {
  const value1 = process.env[name1];
  const value2 = process.env[name2];
  
  if (!value1 || !value2) return false;
  
  if (value1 !== value2) {
    results.push({
      variable: `${name1} 和 ${name2}`,
      status: 'inconsistent',
      message: `${name1}=${value1} 与 ${name2}=${value2} 不一致，必须保持一致`,
      required: true,
    });
    return false;
  }
  return true;
}

// 标记变量为通过
function markPassed(name: string, message?: string): void {
  results.push({
    variable: name,
    status: 'ok',
    message: message || `✅ ${name} 已配置`,
    required: true,
  });
}

console.log('🔍 环境变量校验脚本\n');
console.log('='.repeat(60));
console.log('输入：从 process.env 读取环境变量');
console.log('输出：校验结果（缺失/格式错误/不一致）');
console.log('='.repeat(60));
console.log();

// ============================================
// 1. NextAuth 认证配置（必需）
// ============================================
console.log('1️⃣ 检查 NextAuth 认证配置:');

if (checkExists('NEXTAUTH_SECRET', true)) {
  checkFormat(
    'NEXTAUTH_SECRET',
    (v) => v.length >= 32,
    `NEXTAUTH_SECRET 长度不足 32 字符（当前: ${process.env.NEXTAUTH_SECRET?.length}），请使用至少 32 字符的随机字符串`
  );
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32) {
    markPassed('NEXTAUTH_SECRET', `✅ NEXTAUTH_SECRET 已配置（长度: ${process.env.NEXTAUTH_SECRET.length}）`);
  }
}

if (checkExists('NEXTAUTH_URL', true)) {
  checkFormat(
    'NEXTAUTH_URL',
    (v) => v.startsWith('http://') || v.startsWith('https://'),
    'NEXTAUTH_URL 必须是有效的 URL（以 http:// 或 https:// 开头）'
  );
  if (process.env.NEXTAUTH_URL && (process.env.NEXTAUTH_URL.startsWith('http://') || process.env.NEXTAUTH_URL.startsWith('https://'))) {
    markPassed('NEXTAUTH_URL', `✅ NEXTAUTH_URL 已配置: ${process.env.NEXTAUTH_URL}`);
  }
}

console.log();

// ============================================
// 2. 存储模式配置（必需）
// ============================================
console.log('2️⃣ 检查存储模式配置:');

const storageMode = process.env.STORAGE_MODE;
const publicStorageMode = process.env.NEXT_PUBLIC_STORAGE_MODE;

if (checkExists('STORAGE_MODE', true)) {
  if (storageMode === 'local' || storageMode === 'oss') {
    markPassed('STORAGE_MODE', `✅ STORAGE_MODE=${storageMode}`);
  } else {
    results.push({
      variable: 'STORAGE_MODE',
      status: 'format-error',
      message: `STORAGE_MODE 必须是 'local' 或 'oss'，当前值: ${storageMode}`,
      required: true,
    });
  }
}

if (checkExists('NEXT_PUBLIC_STORAGE_MODE', true)) {
  if (publicStorageMode === 'local' || publicStorageMode === 'oss') {
    markPassed('NEXT_PUBLIC_STORAGE_MODE', `✅ NEXT_PUBLIC_STORAGE_MODE=${publicStorageMode}`);
  } else {
    results.push({
      variable: 'NEXT_PUBLIC_STORAGE_MODE',
      status: 'format-error',
      message: `NEXT_PUBLIC_STORAGE_MODE 必须是 'local' 或 'oss'，当前值: ${publicStorageMode}`,
      required: true,
    });
  }
}

// 检查一致性
if (storageMode && publicStorageMode) {
  if (storageMode === publicStorageMode) {
    markPassed('存储模式一致性', `✅ STORAGE_MODE 和 NEXT_PUBLIC_STORAGE_MODE 一致: ${storageMode}`);
  } else {
    checkConsistency('STORAGE_MODE', 'NEXT_PUBLIC_STORAGE_MODE');
  }
}

// 生产环境强制 OSS 检查
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
if (isProduction) {
  if (storageMode !== 'oss') {
    results.push({
      variable: 'STORAGE_MODE (生产环境)',
      status: 'format-error',
      message: `⚠️  生产环境必须使用 OSS 模式，当前配置: ${storageMode}。请将 STORAGE_MODE 和 NEXT_PUBLIC_STORAGE_MODE 设置为 'oss'`,
      required: true,
    });
  } else {
    markPassed('生产环境存储模式', '✅ 生产环境已配置为 OSS 模式');
  }
}

console.log();

// ============================================
// 3. OSS 配置（OSS 模式必需）
// ============================================
console.log('3️⃣ 检查 OSS 配置:');

const isOSSMode = storageMode === 'oss' || publicStorageMode === 'oss';

if (isOSSMode) {
  // 服务端 OSS 配置
  if (checkExists('OSS_BUCKET', true)) {
    markPassed('OSS_BUCKET');
  }
  if (checkExists('OSS_REGION', true)) {
    markPassed('OSS_REGION', `✅ OSS_REGION=${process.env.OSS_REGION}`);
  }
  if (checkExists('OSS_ACCESS_KEY_ID', true)) {
    const keyId = process.env.OSS_ACCESS_KEY_ID;
    markPassed('OSS_ACCESS_KEY_ID', `✅ OSS_ACCESS_KEY_ID 已配置（${keyId?.substring(0, 10)}...）`);
  }
  if (checkExists('OSS_ACCESS_KEY_SECRET', true)) {
    markPassed('OSS_ACCESS_KEY_SECRET', '✅ OSS_ACCESS_KEY_SECRET 已配置');
  }
  
  // 客户端 OSS 配置
  if (checkExists('NEXT_PUBLIC_OSS_BUCKET', true)) {
    markPassed('NEXT_PUBLIC_OSS_BUCKET');
  }
  if (checkExists('NEXT_PUBLIC_OSS_REGION', true)) {
    markPassed('NEXT_PUBLIC_OSS_REGION', `✅ NEXT_PUBLIC_OSS_REGION=${process.env.NEXT_PUBLIC_OSS_REGION}`);
  }
  
  // OSS_ENDPOINT 和 CDN_BASE 是可选的
  if (process.env.OSS_ENDPOINT) {
    markPassed('OSS_ENDPOINT', `✅ OSS_ENDPOINT=${process.env.OSS_ENDPOINT} (可选)`);
  }
  if (process.env.NEXT_PUBLIC_CDN_BASE) {
    markPassed('NEXT_PUBLIC_CDN_BASE', `✅ NEXT_PUBLIC_CDN_BASE=${process.env.NEXT_PUBLIC_CDN_BASE} (可选)`);
  }
} else {
  console.log('   ℹ️  当前存储模式不是 OSS，跳过 OSS 配置检查');
}

console.log();

// ============================================
// 4. AI 功能配置（可选，但如果有 AI 功能需要）
// ============================================
console.log('4️⃣ 检查 AI 功能配置（可选）:');

if (checkExists('AI_IMAGE_API_KEY', false)) {
  markPassed('AI_IMAGE_API_KEY', '✅ AI_IMAGE_API_KEY 已配置');
} else {
  console.log('   ℹ️  AI_IMAGE_API_KEY 未设置（AI 功能需要此变量）');
}

if (checkExists('AI_IMAGE_API_ENDPOINT', false)) {
  markPassed('AI_IMAGE_API_ENDPOINT', `✅ AI_IMAGE_API_ENDPOINT 已配置`);
} else {
  console.log('   ℹ️  AI_IMAGE_API_ENDPOINT 未设置（AI 功能需要此变量）');
}

if (checkExists('AI_IMAGE_API_MODEL', false)) {
  markPassed('AI_IMAGE_API_MODEL', `✅ AI_IMAGE_API_MODEL=${process.env.AI_IMAGE_API_MODEL}`);
} else {
  console.log('   ℹ️  AI_IMAGE_API_MODEL 未设置（AI 功能需要此变量）');
}

if (checkExists('JIMENG_REQ_KEY', false)) {
  markPassed('JIMENG_REQ_KEY', `✅ JIMENG_REQ_KEY=${process.env.JIMENG_REQ_KEY}`);
} else {
  console.log('   ℹ️  JIMENG_REQ_KEY 未设置（即梦工厂 AI 功能需要此变量）');
}

console.log();

// ============================================
// 5. 其他可选配置
// ============================================
console.log('5️⃣ 检查其他可选配置:');

if (process.env.ADMIN_USERS) {
  markPassed('ADMIN_USERS', '✅ ADMIN_USERS 已配置（用于快速测试）');
} else {
  console.log('   ℹ️  ADMIN_USERS 未设置（可选，用于快速测试）');
}

console.log();

// ============================================
// 6. 总结
// ============================================
console.log('='.repeat(60));
console.log('📊 校验结果总结:');
console.log('='.repeat(60));

const failed = results.filter(r => r.status !== 'ok');
const passed = results.filter(r => r.status === 'ok');

console.log(`\n✅ 通过: ${passed.length} 项`);
console.log(`❌ 失败: ${failed.length} 项`);
console.log(`📋 总计: ${results.length} 项\n`);

if (failed.length > 0) {
  console.log('❌ 失败的变量:');
  failed.forEach((result) => {
    const icon = result.status === 'missing' ? '❌' : result.status === 'format-error' ? '⚠️' : '🔄';
    console.log(`   ${icon} ${result.variable}: ${result.message}`);
  });
  
  console.log('\n📝 修复建议:');
  console.log('   1. 检查 .env.local 文件（开发环境）或 Vercel Dashboard（生产环境）');
  console.log('   2. 确保所有必需变量已配置');
  console.log('   3. 确保变量格式正确（如 NEXTAUTH_SECRET 长度 >= 32）');
  console.log('   4. 确保 STORAGE_MODE 和 NEXT_PUBLIC_STORAGE_MODE 一致');
  if (isProduction && storageMode !== 'oss') {
    console.log('   5. ⚠️  生产环境必须使用 OSS 模式，请将存储模式设置为 "oss"');
  }
  console.log('   6. 如果使用 OSS 模式，确保所有 OSS 相关变量已配置');
  console.log('   7. 重启开发服务器或重新部署（环境变量更改后需要重启）');
  
  process.exit(1);
} else {
  console.log('✅ 所有环境变量校验通过！');
  console.log('\n📝 下一步:');
  console.log('   - 开发环境: 运行 npm run dev 启动开发服务器');
  console.log('   - 生产环境: 确保 Vercel 环境变量已正确配置');
  process.exit(0);
}
