/**
 * 测试 /users/list API
 * 用于诊断 500 错误
 */

import dotenv from 'dotenv';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://api.factory-buy.com';
const BACKEND_TEST_EMAIL = process.env.BACKEND_TEST_EMAIL || 'test@factory-buy.com';
const BACKEND_TEST_PASSWORD = process.env.BACKEND_TEST_PASSWORD || '';

async function testUsersListAPI() {
  console.log('🧪 测试 /users/list API');
  console.log('==================================================\n');

  // 步骤 1: 登录获取 token
  console.log('📋 步骤 1: 登录获取 token');
  console.log(`后端 URL: ${BACKEND_API_URL}`);
  console.log(`测试邮箱: ${BACKEND_TEST_EMAIL}`);
  console.log(`测试密码: ${BACKEND_TEST_PASSWORD ? '已配置' : '未配置'}\n`);

  let token: string | null = null;

  try {
    const loginResponse = await fetch(`${BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: BACKEND_TEST_EMAIL,
        password: BACKEND_TEST_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ 登录失败:', loginResponse.status, errorText);
      return;
    }

    const loginData = await loginResponse.json();
    token = loginData.token || loginData.data?.token;
    
    if (!token) {
      console.error('❌ 登录成功但未获取到 token');
      console.log('登录响应:', JSON.stringify(loginData, null, 2));
      return;
    }

    console.log('✅ 登录成功，获取到 token');
    console.log(`Token 前缀: ${token.substring(0, 20)}...\n`);
  } catch (error: any) {
    console.error('❌ 登录请求失败:', error.message);
    return;
  }

  // 步骤 2: 调用 /users/list
  console.log('📋 步骤 2: 调用 /users/list API');
  
  try {
    const listResponse = await fetch(`${BACKEND_API_URL}/users/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`响应状态: ${listResponse.status} ${listResponse.statusText}`);

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('❌ /users/list 调用失败');
      console.error('错误详情:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('错误 JSON:', JSON.stringify(errorJson, null, 2));
      } catch {
        // 不是 JSON，直接显示文本
      }
      
      return;
    }

    const listData = await listResponse.json();
    console.log('✅ /users/list 调用成功');
    console.log(`用户数量: ${listData.users?.length || 0}`);
    
    if (listData.users && listData.users.length > 0) {
      console.log('\n用户列表:');
      listData.users.forEach((user: any, index: number) => {
        console.log(`  ${index + 1}. ${user.email} (ID: ${user.id}, 积分: ${user.credits})`);
      });
    } else {
      console.log('⚠️  用户列表为空（数据库中没有用户）');
    }
  } catch (error: any) {
    console.error('❌ /users/list 请求失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }

  console.log('\n==================================================');
  console.log('测试完成');
}

// 运行测试
testUsersListAPI().catch(console.error);







