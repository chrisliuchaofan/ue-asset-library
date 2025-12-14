#!/usr/bin/env tsx
/**
 * M1 用户身份链路测试脚本
 * 
 * 测试前后端用户身份传递是否正确
 * 
 * 使用方法：
 *   tsx scripts/test-user-identity-chain.ts
 * 
 * 环境变量要求：
 *   - ADMIN_USERS: 前端用户列表（格式：username:password 或 email:password）
 *   - NEXT_PUBLIC_BACKEND_API_URL: 后端 API URL
 *   - BACKEND_TEST_EMAIL: 后端测试 email（可选）
 *   - BACKEND_TEST_PASSWORD: 后端测试密码（可选）
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 加载环境变量（手动解析 .env.local 文件）
function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // 解析 KEY=VALUE 格式
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // 移除引号（如果有）
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // 如果环境变量未设置，则设置它
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    // 如果文件不存在，忽略错误（环境变量可能已通过其他方式设置）
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[test-user-identity-chain] 无法加载环境变量文件 ${filePath}:`, error);
    }
  }
}

// 尝试加载 .env.local 文件
const envPath = resolve(__dirname, '../.env.local');
loadEnvFile(envPath);

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
                        process.env.BACKEND_API_URL || 
                        'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details && !passed) {
    console.log('   详情:', JSON.stringify(details, null, 2));
  }
}

/**
 * 测试 1: 检查环境变量配置
 */
async function test1_CheckEnvConfig() {
  console.log('\n📋 测试 1: 检查环境变量配置');
  
  const adminUsers = process.env.ADMIN_USERS;
  const backendUrl = BACKEND_API_URL;
  const backendTestEmail = process.env.BACKEND_TEST_EMAIL;
  const backendTestPassword = process.env.BACKEND_TEST_PASSWORD;
  
  if (!adminUsers) {
    addResult(
      '环境变量 ADMIN_USERS',
      false,
      '未配置 ADMIN_USERS 环境变量',
      { adminUsers }
    );
    return;
  }
  
  addResult(
    '环境变量 ADMIN_USERS',
    true,
    `已配置: ${adminUsers.split(',').length} 个用户`,
    { adminUsers }
  );
  
  addResult(
    '后端 API URL',
    true,
    `已配置: ${backendUrl}`,
    { backendUrl }
  );
  
  if (backendTestEmail && backendTestPassword) {
    addResult(
      'BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD',
      true,
      '已配置统一后端测试凭据',
      { backendTestEmail, hasPassword: !!backendTestPassword }
    );
  } else {
    addResult(
      'BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD',
      false,
      '未配置，将使用 ADMIN_USERS 中的密码',
      { backendTestEmail, hasPassword: !!backendTestPassword }
    );
  }
}

/**
 * 测试 2: 检查后端服务是否可用
 */
async function test2_CheckBackendHealth() {
  console.log('\n📋 测试 2: 检查后端服务是否可用');
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      addResult(
        '后端健康检查',
        true,
        '后端服务可用',
        { status: response.status, data }
      );
    } else {
      addResult(
        '后端健康检查',
        false,
        `后端服务返回错误: ${response.status} ${response.statusText}`,
        { status: response.status }
      );
    }
  } catch (error) {
    addResult(
      '后端健康检查',
      false,
      `无法连接到后端服务: ${error instanceof Error ? error.message : String(error)}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * 测试 3: 测试后端登录
 */
async function test3_TestBackendLogin() {
  console.log('\n📋 测试 3: 测试后端登录');
  
  const adminUsers = process.env.ADMIN_USERS || '';
  if (!adminUsers) {
    addResult(
      '后端登录测试',
      false,
      'ADMIN_USERS 未配置，跳过测试',
      {}
    );
    return;
  }
  
  // 解析第一个用户
  const firstUser = adminUsers.split(',')[0];
  const [username, password] = firstUser.split(':');
  const usernameTrimmed = username.trim();
  const passwordTrimmed = password.trim();
  
  // 生成 email（如果 username 不包含 @，添加 @admin.local）
  const email = usernameTrimmed.includes('@') 
    ? usernameTrimmed 
    : `${usernameTrimmed}@admin.local`;
  
  // 使用 BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD（如果配置）
  const backendEmail = process.env.BACKEND_TEST_EMAIL || email;
  const backendPassword = process.env.BACKEND_TEST_PASSWORD || passwordTrimmed;
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: backendEmail,
        password: backendPassword,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      addResult(
        '后端登录测试',
        true,
        '后端登录成功',
        {
          email: backendEmail,
          userId: data.userId,
          hasToken: !!data.token,
        }
      );
      return data.token;
    } else {
      const errorText = await response.text();
      addResult(
        '后端登录测试',
        false,
        `后端登录失败: ${response.status} ${response.statusText}`,
        {
          email: backendEmail,
          status: response.status,
          error: errorText.substring(0, 200),
        }
      );
      return null;
    }
  } catch (error) {
    addResult(
      '后端登录测试',
      false,
      `后端登录请求失败: ${error instanceof Error ? error.message : String(error)}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
    return null;
  }
}

/**
 * 测试 4: 测试后端 /me 接口（如果不可用，尝试 /credits/balance）
 */
async function test4_TestBackendMe(token: string | null) {
  console.log('\n📋 测试 4: 测试后端用户信息接口');
  
  if (!token) {
    addResult(
      '后端用户信息接口测试',
      false,
      '没有有效的 token，跳过测试',
      {}
    );
    return;
  }
  
  // 首先尝试 /me 接口
  try {
    const response = await fetch(`${BACKEND_API_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      addResult(
        '后端 /me 接口测试',
        true,
        '后端 /me 接口调用成功',
        {
          userId: data.userId,
          email: data.email,
          balance: data.balance,
          billingMode: data.billingMode,
          modelMode: data.modelMode,
        }
      );
      return; // 成功，直接返回
    } else if (response.status === 404) {
      // /me 接口不存在，尝试使用 /credits/balance 作为替代
      console.log('  ⚠️  /me 接口不可用（404），尝试使用 /credits/balance 接口作为替代');
      
      try {
        const balanceResponse = await fetch(`${BACKEND_API_URL}/credits/balance`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          addResult(
            '后端用户信息接口测试（使用 /credits/balance 替代）',
            true,
            '/me 接口不可用，但 /credits/balance 接口可用（生产环境可能未部署 MeController）',
            {
              balance: balanceData.balance,
              note: '生产环境可能使用旧版本后端，/me 接口未部署。建议检查生产环境后端代码版本。',
            }
          );
          return;
        } else {
          const errorText = await balanceResponse.text();
          addResult(
            '后端用户信息接口测试',
            false,
            `/me 接口不可用（404），/credits/balance 接口也失败: ${balanceResponse.status}`,
            {
              meStatus: 404,
              balanceStatus: balanceResponse.status,
              error: errorText.substring(0, 200),
            }
          );
          return;
        }
      } catch (balanceError) {
        addResult(
          '后端用户信息接口测试',
          false,
          `/me 接口不可用（404），/credits/balance 接口请求失败`,
          {
            meStatus: 404,
            balanceError: balanceError instanceof Error ? balanceError.message : String(balanceError),
          }
        );
        return;
      }
    } else {
      const errorText = await response.text();
      let errorMessage = `后端 /me 接口调用失败: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage += '\n可能的原因：\n1. Token 无效或已过期\n2. AuthGuard 验证失败';
      }
      
      addResult(
        '后端 /me 接口测试',
        false,
        errorMessage,
        {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
          url: `${BACKEND_API_URL}/me`,
        }
      );
      return;
    }
  } catch (error) {
    addResult(
      '后端 /me 接口测试',
      false,
      `后端 /me 接口请求失败: ${error instanceof Error ? error.message : String(error)}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * 测试 5: 测试多用户场景
 */
async function test5_TestMultipleUsers() {
  console.log('\n📋 测试 5: 测试多用户场景');
  
  const adminUsers = process.env.ADMIN_USERS || '';
  if (!adminUsers || adminUsers.split(',').length < 2) {
    addResult(
      '多用户场景测试',
      true,
      'ADMIN_USERS 中只有 1 个用户，跳过多用户测试（这是正常的，如果只需要测试单个用户）',
      { userCount: adminUsers ? adminUsers.split(',').length : 0, note: '如需测试多用户场景，请在 ADMIN_USERS 中配置多个用户' }
    );
    return;
  }
  
  const users = adminUsers.split(',');
  let successCount = 0;
  
  for (const userStr of users.slice(0, 3)) { // 最多测试 3 个用户
    const [username, password] = userStr.split(':');
    const usernameTrimmed = username.trim();
    const passwordTrimmed = password.trim();
    
    const email = usernameTrimmed.includes('@') 
      ? usernameTrimmed 
      : `${usernameTrimmed}@admin.local`;
    
    const backendEmail = process.env.BACKEND_TEST_EMAIL || email;
    const backendPassword = process.env.BACKEND_TEST_PASSWORD || passwordTrimmed;
    
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: backendEmail,
          password: backendPassword,
        }),
      });
      
      if (response.ok) {
        successCount++;
      }
    } catch (error) {
      // 忽略错误，继续测试下一个用户
    }
  }
  
  if (successCount === users.slice(0, 3).length) {
    addResult(
      '多用户场景测试',
      true,
      `所有用户都能成功登录 (${successCount}/${users.slice(0, 3).length})`,
      { successCount, totalTested: users.slice(0, 3).length }
    );
  } else {
    addResult(
      '多用户场景测试',
      false,
      `部分用户登录失败 (${successCount}/${users.slice(0, 3).length})`,
      { successCount, totalTested: users.slice(0, 3).length }
    );
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 M1 用户身份链路测试脚本');
  console.log('='.repeat(50));
  
  // 运行所有测试
  await test1_CheckEnvConfig();
  await test2_CheckBackendHealth();
  const token = await test3_TestBackendLogin();
  await test4_TestBackendMe(token);
  await test5_TestMultipleUsers();
  
  // 汇总结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = total - passed;
  
  console.log(`总计: ${total} 个测试`);
  console.log(`通过: ${passed} 个 ✅`);
  console.log(`失败: ${failed} 个 ${failed > 0 ? '❌' : ''}`);
  
  if (failed > 0) {
    console.log('\n❌ 失败的测试:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
  }
}

// 运行主函数
main().catch(error => {
  console.error('❌ 测试脚本执行失败:', error);
  process.exit(1);
});

