#!/usr/bin/env tsx
/**
 * 项目健康体检脚本
 * 
 * 功能：
 * 1. 检查未使用的依赖
 * 2. 检查构建产物是否误入仓库
 * 3. 检查大文件
 * 4. 检查重复文件
 * 5. 检查环境变量使用情况
 * 
 * 使用方法：
 * npm run health-check           # 运行所有检查
 * npm run health-check:deps      # 只检查依赖
 * npm run health-check:build     # 只检查构建产物
 * npm run health-check:files     # 只检查文件
 * npm run health-check:env       # 只检查环境变量
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string[];
}

const PROJECT_ROOT = process.cwd();
const results: CheckResult[] = [];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(result: CheckResult) {
  results.push(result);
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  log(`${icon} ${result.name}`, result.status === 'pass' ? 'green' : result.status === 'warn' ? 'yellow' : 'red');
  if (result.message) {
    console.log(`   ${result.message}`);
  }
  if (result.details && result.details.length > 0) {
    result.details.forEach(detail => console.log(`   - ${detail}`));
  }
}

// 1. 检查未使用的依赖
function checkUnusedDependencies(): void {
  log('\n📦 检查未使用的依赖...', 'blue');
  
  try {
    const packageJsonPath = join(PROJECT_ROOT, 'package.json');
    if (!existsSync(packageJsonPath)) {
      addResult({
        name: '依赖检查',
        status: 'fail',
        message: 'package.json 不存在',
      });
      return;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    const allDeps = [...dependencies, ...devDependencies];

    // 已知的未使用依赖（从体检报告中）
    const knownUnused = ['graceful-fs', 'ogl', 'gsap', '@google/genai', 'proxy-agent'];
    const foundUnused: string[] = [];

    // 简单检查：搜索代码中是否有引用
    for (const dep of allDeps) {
      if (knownUnused.includes(dep)) {
        // 检查是否在代码中使用
        try {
          const searchPattern = dep.replace('@', '').replace('/', '\\/');
          const result = execSync(
            `grep -r "${searchPattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist 2>/dev/null | head -1`,
            { cwd: PROJECT_ROOT, encoding: 'utf-8' }
          );
          
          if (!result.trim()) {
            foundUnused.push(dep);
          }
        } catch (e) {
          // grep 没找到，可能是未使用
          foundUnused.push(dep);
        }
      }
    }

    if (foundUnused.length > 0) {
      addResult({
        name: '未使用的依赖',
        status: 'warn',
        message: `发现 ${foundUnused.length} 个可能未使用的依赖`,
        details: foundUnused.map(dep => `- ${dep}`),
      });
    } else {
      addResult({
        name: '依赖检查',
        status: 'pass',
        message: '未发现明显未使用的依赖',
      });
    }
  } catch (error) {
    addResult({
      name: '依赖检查',
      status: 'fail',
      message: `检查失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// 2. 检查构建产物是否误入仓库
function checkBuildArtifacts(): void {
  log('\n🏗️  检查构建产物...', 'blue');
  
  const buildArtifacts = [
    'build.log',
    'tsconfig.tsbuildinfo',
    'backend-api/dist',
    'backend-api/dist/tsconfig.tsbuildinfo',
    '.next',
  ];

  const foundArtifacts: string[] = [];

  for (const artifact of buildArtifacts) {
    const artifactPath = join(PROJECT_ROOT, artifact);
    if (existsSync(artifactPath)) {
      // 检查是否在 .gitignore 中
      try {
        const gitignorePath = join(PROJECT_ROOT, '.gitignore');
        if (existsSync(gitignorePath)) {
          const gitignore = readFileSync(gitignorePath, 'utf-8');
          const artifactPattern = artifact.replace(/\//g, '\\/').replace(/\./g, '\\.');
          if (!gitignore.includes(artifact) && !gitignore.match(new RegExp(artifactPattern))) {
            foundArtifacts.push(artifact);
          }
        } else {
          foundArtifacts.push(artifact);
        }
      } catch (e) {
        foundArtifacts.push(artifact);
      }
    }
  }

  if (foundArtifacts.length > 0) {
    addResult({
      name: '构建产物检查',
      status: 'warn',
      message: `发现 ${foundArtifacts.length} 个构建产物文件/目录`,
      details: foundArtifacts.map(artifact => `- ${artifact}`),
    });
  } else {
    addResult({
      name: '构建产物检查',
      status: 'pass',
      message: '未发现误入仓库的构建产物',
    });
  }
}

// 3. 检查大文件
function checkLargeFiles(): void {
  log('\n📁 检查大文件...', 'blue');
  
  const largeFiles: Array<{ path: string; size: number }> = [];
  const maxSize = 1 * 1024 * 1024; // 1MB

  function scanDirectory(dir: string, depth: number = 0): void {
    if (depth > 10) return; // 防止无限递归
    if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('dist')) {
      return; // 跳过这些目录
    }

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = relative(PROJECT_ROOT, fullPath);

        if (entry.isFile()) {
          try {
            const stats = statSync(fullPath);
            if (stats.size > maxSize) {
              largeFiles.push({
                path: relativePath,
                size: stats.size,
              });
            }
          } catch (e) {
            // 忽略无法访问的文件
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDirectory(fullPath, depth + 1);
        }
      }
    } catch (e) {
      // 忽略无法访问的目录
    }
  }

  scanDirectory(PROJECT_ROOT);

  if (largeFiles.length > 0) {
    const sortedFiles = largeFiles.sort((a, b) => b.size - a.size).slice(0, 10);
    addResult({
      name: '大文件检查',
      status: 'warn',
      message: `发现 ${largeFiles.length} 个大文件（>1MB），显示前10个`,
      details: sortedFiles.map(file => 
        `- ${file.path} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
      ),
    });
  } else {
    addResult({
      name: '大文件检查',
      status: 'pass',
      message: '未发现大文件',
    });
  }
}

// 4. 检查环境变量使用情况
function checkEnvironmentVariables(): void {
  log('\n🔐 检查环境变量...', 'blue');
  
  try {
    const envExamplePath = join(PROJECT_ROOT, '.env.example');
    if (!existsSync(envExamplePath)) {
      addResult({
        name: '环境变量检查',
        status: 'warn',
        message: '.env.example 文件不存在，跳过检查',
      });
      return;
    }

    const envExample = readFileSync(envExamplePath, 'utf-8');
    const envVars = envExample
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => line.split('=')[0].trim());

    const unusedVars: string[] = [];

    for (const envVar of envVars) {
      try {
        const searchPattern = envVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const result = execSync(
          `grep -r "process\\.env\\.${searchPattern}\\|process\\.env\\['${searchPattern}'\\]\\|process\\.env\\[\"${searchPattern}\"\\]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist 2>/dev/null | head -1`,
          { cwd: PROJECT_ROOT, encoding: 'utf-8' }
        );
        
        if (!result.trim()) {
          unusedVars.push(envVar);
        }
      } catch (e) {
        // grep 没找到，可能是未使用
        unusedVars.push(envVar);
      }
    }

    if (unusedVars.length > 0) {
      addResult({
        name: '环境变量检查',
        status: 'warn',
        message: `发现 ${unusedVars.length} 个可能未使用的环境变量`,
        details: unusedVars.slice(0, 10).map(v => `- ${v}`),
      });
    } else {
      addResult({
        name: '环境变量检查',
        status: 'pass',
        message: '所有环境变量都在使用中',
      });
    }
  } catch (error) {
    addResult({
      name: '环境变量检查',
      status: 'fail',
      message: `检查失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// 5. 检查重复文件（使用现有脚本）
function checkDuplicateFiles(): void {
  log('\n🔄 检查重复文件...', 'blue');
  
  try {
    // 使用现有的 find-same-size 脚本
    const result = execSync('npm run find-same-size', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    if (result.includes('Found') || result.includes('found')) {
      addResult({
        name: '重复文件检查',
        status: 'warn',
        message: '发现可能重复的文件，请运行 npm run find-same-size 查看详情',
      });
    } else {
      addResult({
        name: '重复文件检查',
        status: 'pass',
        message: '未发现重复文件',
      });
    }
  } catch (error) {
    // 脚本可能不存在或出错，跳过
    addResult({
      name: '重复文件检查',
      status: 'warn',
      message: '无法运行重复文件检查脚本，请手动运行 npm run find-same-size',
    });
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const checkAll = args.includes('--all') || args.length === 0;
  const checkDeps = args.includes('--deps') || checkAll;
  const checkBuild = args.includes('--build') || checkAll;
  const checkFiles = args.includes('--files') || checkAll;
  const checkEnv = args.includes('--env') || checkAll;

  log('🔍 项目健康体检开始...\n', 'blue');
  log(`项目根目录: ${PROJECT_ROOT}\n`);

  if (checkDeps) {
    checkUnusedDependencies();
  }

  if (checkBuild) {
    checkBuildArtifacts();
  }

  if (checkFiles) {
    checkLargeFiles();
    checkDuplicateFiles();
  }

  if (checkEnv) {
    checkEnvironmentVariables();
  }

  // 输出总结
  log('\n📊 体检总结:', 'blue');
  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  log(`✅ 通过: ${passCount}`, 'green');
  log(`⚠️  警告: ${warnCount}`, 'yellow');
  log(`❌ 失败: ${failCount}`, 'red');

  if (warnCount > 0 || failCount > 0) {
    log('\n💡 建议:', 'blue');
    log('1. 查看上方警告和失败项，根据《分阶段清理计划.md》进行处理');
    log('2. 定期运行此脚本，保持项目健康');
    log('3. 每周运行一次: npm run health-check');
    process.exit(1);
  } else {
    log('\n🎉 项目健康状况良好！', 'green');
    process.exit(0);
  }
}

main();

