/**
 * M3 验证脚本：验证数据库和后端服务运行状态
 * 
 * 使用方法：
 *   npm run verify:m3
 *   或
 *   tsx scripts/verify-m3-system-status.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 手动解析 .env.local 文件（因为 tsx 可能无法自动加载）
function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // 移除引号
          env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return env;
  } catch (error) {
    return {};
  }
}

// 加载环境变量
const envPath = resolve(__dirname, '../.env.local');
const env = loadEnvFile(envPath);
Object.assign(process.env, env);

interface VerificationResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

// 1. 验证前端环境变量配置
function verifyFrontendEnv(): VerificationResult {
  const requiredVars = [
    'ADMIN_USERS',
    'NEXTAUTH_SECRET',
  ];
  
  const optionalVars = [
    'BACKEND_API_URL',
    'NEXT_PUBLIC_BACKEND_API_URL',
    'BACKEND_TEST_EMAIL',
    'BACKEND_TEST_PASSWORD',
  ];
  
  const missing: string[] = [];
  const present: string[] = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    }
  });
  
  if (missing.length > 0) {
    return {
      name: '前端环境变量配置',
      status: '❌',
      message: `缺少必需的环境变量: ${missing.join(', ')}`,
      details: { missing, present },
    };
  }
  
  return {
    name: '前端环境变量配置',
    status: '✅',
    message: `所有必需的环境变量已配置 (${present.length} 个)`,
    details: { present },
  };
}

// 2. 验证后端 API URL 配置
function verifyBackendUrl(): VerificationResult {
  const backendUrl = process.env.BACKEND_API_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_API_URL ||
                     'https://api.factory-buy.com';
  
  return {
    name: '后端 API URL 配置',
    status: backendUrl ? '✅' : '❌',
    message: backendUrl ? `后端 API URL: ${backendUrl}` : '后端 API URL 未配置',
    details: { backendUrl },
  };
}

// 3. 测试后端健康检查接口
async function verifyBackendHealth(): Promise<VerificationResult> {
  const backendUrl = process.env.BACKEND_API_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_API_URL ||
                     'https://api.factory-buy.com';
  
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return {
        name: '后端健康检查',
        status: '❌',
        message: `后端健康检查失败: ${response.status} ${response.statusText}`,
        details: { status: response.status, statusText: response.statusText },
      };
    }
    
    const data = await response.json();
    return {
      name: '后端健康检查',
      status: '✅',
      message: '后端服务运行正常',
      details: data,
    };
  } catch (error: any) {
    return {
      name: '后端健康检查',
      status: '❌',
      message: `无法连接到后端服务: ${error.message}`,
      details: { error: error.message, backendUrl },
    };
  }
}

// 4. 测试后端登录接口
async function verifyBackendLogin(): Promise<VerificationResult> {
  const backendUrl = process.env.BACKEND_API_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_API_URL ||
                     'https://api.factory-buy.com';
  
  // 尝试从 ADMIN_USERS 获取测试用户
  const adminUsers = process.env.ADMIN_USERS || '';
  const testEmail = process.env.BACKEND_TEST_EMAIL || 'test@factory-buy.com';
  const testPassword = process.env.BACKEND_TEST_PASSWORD || '';
  
  let email = testEmail;
  let password = testPassword;
  
  // 如果 BACKEND_TEST_PASSWORD 未配置，尝试从 ADMIN_USERS 解析
  if (!password && adminUsers) {
    const users = adminUsers.split(',').map(u => u.trim());
    const firstUser = users[0];
    if (firstUser && firstUser.includes(':')) {
      const [userEmail, userPassword] = firstUser.split(':');
      email = userEmail.trim();
      password = userPassword.trim();
    }
  }
  
  if (!password) {
    return {
      name: '后端登录测试',
      status: '⚠️',
      message: '无法获取测试密码（请配置 BACKEND_TEST_PASSWORD 或 ADMIN_USERS）',
      details: { email, hasPassword: false },
    };
  }
  
  try {
    const response = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        name: '后端登录测试',
        status: '❌',
        message: `后端登录失败: ${response.status} ${response.statusText}`,
        details: { 
          status: response.status, 
          error: errorText.substring(0, 200),
          email,
        },
      };
    }
    
    const data = await response.json();
    return {
      name: '后端登录测试',
      status: '✅',
      message: '后端登录成功',
      details: { 
        email,
        hasToken: !!data.token,
        tokenLength: data.token?.length || 0,
      },
    };
  } catch (error: any) {
    return {
      name: '后端登录测试',
      status: '❌',
      message: `无法连接到后端登录接口: ${error.message}`,
      details: { error: error.message },
    };
  }
}

// 5. 测试后端 /me 接口（如果可用）
async function verifyBackendMe(): Promise<VerificationResult> {
  const backendUrl = process.env.BACKEND_API_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_API_URL ||
                     'https://api.factory-buy.com';
  
  // 先登录获取 token
  const testEmail = process.env.BACKEND_TEST_EMAIL || 'test@factory-buy.com';
  const testPassword = process.env.BACKEND_TEST_PASSWORD || '';
  
  if (!testPassword) {
    return {
      name: '后端 /me 接口测试',
      status: '⚠️',
      message: '跳过测试（需要登录凭据）',
      details: {},
    };
  }
  
  try {
    // 登录
    const loginResponse = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    
    if (!loginResponse.ok) {
      return {
        name: '后端 /me 接口测试',
        status: '⚠️',
        message: '无法登录，跳过 /me 接口测试',
        details: {},
      };
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      return {
        name: '后端 /me 接口测试',
        status: '⚠️',
        message: '登录成功但未返回 token',
        details: {},
      };
    }
    
    // 测试 /me 接口
    const meResponse = await fetch(`${backendUrl}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (meResponse.status === 404) {
      return {
        name: '后端 /me 接口测试',
        status: '⚠️',
        message: '/me 接口返回 404（可能未部署，前端会使用 /credits/balance 作为替代）',
        details: { status: 404 },
      };
    }
    
    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      return {
        name: '后端 /me 接口测试',
        status: '❌',
        message: `/me 接口调用失败: ${meResponse.status} ${meResponse.statusText}`,
        details: { 
          status: meResponse.status, 
          error: errorText.substring(0, 200),
        },
      };
    }
    
    const meData = await meResponse.json();
    return {
      name: '后端 /me 接口测试',
      status: '✅',
      message: '/me 接口可用',
      details: {
        userId: meData.userId,
        email: meData.email,
        balance: meData.balance,
        billingMode: meData.billingMode,
        modelMode: meData.modelMode,
      },
    };
  } catch (error: any) {
    return {
      name: '后端 /me 接口测试',
      status: '❌',
      message: `测试 /me 接口时出错: ${error.message}`,
      details: { error: error.message },
    };
  }
}

// 6. 测试后端 /credits/balance 接口
async function verifyBackendBalance(): Promise<VerificationResult> {
  const backendUrl = process.env.BACKEND_API_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_API_URL ||
                     'https://api.factory-buy.com';
  
  const testEmail = process.env.BACKEND_TEST_EMAIL || 'test@factory-buy.com';
  const testPassword = process.env.BACKEND_TEST_PASSWORD || '';
  
  if (!testPassword) {
    return {
      name: '后端 /credits/balance 接口测试',
      status: '⚠️',
      message: '跳过测试（需要登录凭据）',
      details: {},
    };
  }
  
  try {
    // 登录
    const loginResponse = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    
    if (!loginResponse.ok) {
      return {
        name: '后端 /credits/balance 接口测试',
        status: '⚠️',
        message: '无法登录，跳过 /credits/balance 接口测试',
        details: {},
      };
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      return {
        name: '后端 /credits/balance 接口测试',
        status: '⚠️',
        message: '登录成功但未返回 token',
        details: {},
      };
    }
    
    // 测试 /credits/balance 接口
    const balanceResponse = await fetch(`${backendUrl}/credits/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text();
      return {
        name: '后端 /credits/balance 接口测试',
        status: '❌',
        message: `/credits/balance 接口调用失败: ${balanceResponse.status} ${balanceResponse.statusText}`,
        details: { 
          status: balanceResponse.status, 
          error: errorText.substring(0, 200),
        },
      };
    }
    
    const balanceData = await balanceResponse.json();
    return {
      name: '后端 /credits/balance 接口测试',
      status: '✅',
      message: `/credits/balance 接口可用，余额: ${balanceData.balance}`,
      details: {
        balance: balanceData.balance,
      },
    };
  } catch (error: any) {
    return {
      name: '后端 /credits/balance 接口测试',
      status: '❌',
      message: `测试 /credits/balance 接口时出错: ${error.message}`,
      details: { error: error.message },
    };
  }
}

// 主函数
async function main() {
  console.log('🧪 M3 系统状态验证脚本');
  console.log('==================================================\n');
  
  // 1. 验证前端环境变量
  console.log('📋 测试 1: 检查前端环境变量配置');
  const frontendEnvResult = verifyFrontendEnv();
  results.push(frontendEnvResult);
  console.log(`${frontendEnvResult.status} ${frontendEnvResult.name}: ${frontendEnvResult.message}`);
  if (frontendEnvResult.details) {
    console.log('   详情:', JSON.stringify(frontendEnvResult.details, null, 2));
  }
  console.log('');
  
  // 2. 验证后端 API URL
  console.log('📋 测试 2: 检查后端 API URL 配置');
  const backendUrlResult = verifyBackendUrl();
  results.push(backendUrlResult);
  console.log(`${backendUrlResult.status} ${backendUrlResult.name}: ${backendUrlResult.message}`);
  console.log('');
  
  // 3. 测试后端健康检查
  console.log('📋 测试 3: 测试后端健康检查接口');
  const healthResult = await verifyBackendHealth();
  results.push(healthResult);
  console.log(`${healthResult.status} ${healthResult.name}: ${healthResult.message}`);
  if (healthResult.details) {
    console.log('   详情:', JSON.stringify(healthResult.details, null, 2));
  }
  console.log('');
  
  // 4. 测试后端登录
  console.log('📋 测试 4: 测试后端登录接口');
  const loginResult = await verifyBackendLogin();
  results.push(loginResult);
  console.log(`${loginResult.status} ${loginResult.name}: ${loginResult.message}`);
  if (loginResult.details) {
    console.log('   详情:', JSON.stringify(loginResult.details, null, 2));
  }
  console.log('');
  
  // 5. 测试后端 /me 接口
  console.log('📋 测试 5: 测试后端 /me 接口');
  const meResult = await verifyBackendMe();
  results.push(meResult);
  console.log(`${meResult.status} ${meResult.name}: ${meResult.message}`);
  if (meResult.details) {
    console.log('   详情:', JSON.stringify(meResult.details, null, 2));
  }
  console.log('');
  
  // 6. 测试后端 /credits/balance 接口
  console.log('📋 测试 6: 测试后端 /credits/balance 接口');
  const balanceResult = await verifyBackendBalance();
  results.push(balanceResult);
  console.log(`${balanceResult.status} ${balanceResult.name}: ${balanceResult.message}`);
  if (balanceResult.details) {
    console.log('   详情:', JSON.stringify(balanceResult.details, null, 2));
  }
  console.log('');
  
  // 汇总结果
  console.log('==================================================');
  console.log('📊 测试结果汇总');
  console.log('==================================================');
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  const total = results.length;
  
  console.log(`总计: ${total} 个测试`);
  console.log(`通过: ${passed} 个 ✅`);
  console.log(`失败: ${failed} 个 ❌`);
  console.log(`警告: ${warnings} 个 ⚠️`);
  console.log('');
  
  if (failed > 0) {
    console.log('❌ 失败的测试:');
    results.filter(r => r.status === '❌').forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log('');
  }
  
  if (warnings > 0) {
    console.log('⚠️  警告的测试:');
    results.filter(r => r.status === '⚠️').forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log('');
  }
  
  if (failed === 0 && warnings === 0) {
    console.log('✅ 所有测试通过！系统状态正常。');
  } else if (failed === 0) {
    console.log('✅ 所有关键测试通过，但有一些警告需要关注。');
  } else {
    console.log('❌ 部分测试失败，请检查系统配置。');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ 验证脚本执行失败:', error);
  process.exit(1);
});

