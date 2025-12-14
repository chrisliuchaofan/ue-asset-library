#!/usr/bin/env node

/**
 * 前端与后端集成测试脚本
 * 使用方法：node test-integration.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.factory-buy.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@factory-buy.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

let authToken = null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 测试函数
async function testHealthCheck() {
  logInfo('测试 1: 健康检查');
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      logSuccess('健康检查通过');
      return true;
    } else {
      logError('健康检查失败: 状态不正确');
      return false;
    }
  } catch (error) {
    logError(`健康检查失败: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  logInfo('测试 2: 用户登录');
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      logError(`登录失败: ${errorData.message || response.statusText}`);
      return false;
    }

    const data = await response.json();
    
    if (data.token) {
      authToken = data.token;
      logSuccess('登录成功，已保存 token');
      return true;
    } else {
      logError('登录失败: 未返回 token');
      return false;
    }
  } catch (error) {
    logError(`登录失败: ${error.message}`);
    return false;
  }
}

async function testTokenVerify() {
  logInfo('测试 3: Token 验证');
  if (!authToken) {
    logWarning('跳过: 未获取到 token');
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: authToken,
      }),
    });

    if (!response.ok) {
      logError(`Token 验证失败: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    logSuccess('Token 验证成功');
    return true;
  } catch (error) {
    logError(`Token 验证失败: ${error.message}`);
    return false;
  }
}

async function testGetBalance() {
  logInfo('测试 4: 查询积分余额');
  if (!authToken) {
    logWarning('跳过: 未获取到 token');
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/credits/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-User-Id': TEST_EMAIL,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      logError(`查询积分失败: ${errorData.message || response.statusText}`);
      return false;
    }

    const data = await response.json();
    logSuccess(`查询积分成功: 余额 = ${data.balance}`);
    return true;
  } catch (error) {
    logError(`查询积分失败: ${error.message}`);
    return false;
  }
}

async function testConsumeCredits() {
  logInfo('测试 5: 消费积分');
  if (!authToken) {
    logWarning('跳过: 未获取到 token');
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/credits/consume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-User-Id': TEST_EMAIL,
      },
      body: JSON.stringify({
        amount: 1,
        action: 'integration_test',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      logError(`消费积分失败: ${errorData.message || response.statusText}`);
      return false;
    }

    const data = await response.json();
    logSuccess(`消费积分成功: 余额 = ${data.balance}, 交易ID = ${data.transactionId}`);
    return true;
  } catch (error) {
    logError(`消费积分失败: ${error.message}`);
    return false;
  }
}

async function testCreateLog() {
  logInfo('测试 6: 创建日志');
  if (!authToken) {
    logWarning('跳过: 未获取到 token');
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/logs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-User-Id': TEST_EMAIL,
      },
      body: JSON.stringify({
        action: 'integration_test',
        details: {
          test: true,
          timestamp: new Date().toISOString(),
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      logError(`创建日志失败: ${errorData.message || response.statusText}`);
      return false;
    }

    const data = await response.json();
    logSuccess(`创建日志成功: 日志ID = ${data.logId}`);
    return true;
  } catch (error) {
    logError(`创建日志失败: ${error.message}`);
    return false;
  }
}

async function testUnauthorizedAccess() {
  logInfo('测试 7: 未认证访问（应该失败）');
  try {
    const response = await fetch(`${BACKEND_URL}/credits/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': TEST_EMAIL,
        // 不提供 Authorization header
      },
    });

    if (response.status === 401) {
      logSuccess('未认证访问正确返回 401');
      return true;
    } else {
      logError(`未认证访问未返回 401，实际状态: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`未认证访问测试失败: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('\n🧪 开始前端与后端集成测试\n');
  console.log(`后端 URL: ${BACKEND_URL}`);
  console.log(`测试用户: ${TEST_EMAIL}\n`);

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // 运行测试
  const tests = [
    { name: '健康检查', fn: testHealthCheck },
    { name: '用户登录', fn: testLogin },
    { name: 'Token 验证', fn: testTokenVerify },
    { name: '查询积分', fn: testGetBalance },
    { name: '消费积分', fn: testConsumeCredits },
    { name: '创建日志', fn: testCreateLog },
    { name: '未认证访问', fn: testUnauthorizedAccess },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      logError(`测试 "${test.name}" 异常: ${error.message}`);
      results.failed++;
    }
    console.log(''); // 空行分隔
  }

  // 输出总结
  console.log('\n📊 测试总结:');
  logSuccess(`通过: ${results.passed}`);
  logError(`失败: ${results.failed}`);
  logWarning(`跳过: ${results.skipped}`);
  console.log('');

  if (results.failed === 0) {
    logSuccess('🎉 所有测试通过！');
    process.exit(0);
  } else {
    logError('❌ 部分测试失败，请检查上述错误信息');
    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  logError(`测试运行异常: ${error.message}`);
  process.exit(1);
});

