#!/usr/bin/env tsx
/**
 * OSS 重复文件清理脚本
 * 
 * 功能：
 * 1. 扫描 OSS 中的所有文件
 * 2. 识别重复文件（基于文件名、大小、hash）
 * 3. 生成清理报告
 * 4. 可选：自动清理重复文件
 * 
 * 使用方法：
 * npm run cleanup-duplicates [--dry-run] [--delete]
 * 
 * --dry-run: 只扫描，不删除（默认）
 * --delete: 实际删除重复文件（谨慎使用）
 */

import OSS from 'ali-oss';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface FileInfo {
  name: string;
  size: number;
  lastModified: Date;
  url: string;
  hash?: string;
}

interface DuplicateGroup {
  key: string; // 用于分组的键（文件名或 hash）
  files: FileInfo[];
  keepFile: FileInfo; // 保留的文件（最早上传的）
  deleteFiles: FileInfo[]; // 要删除的文件
  totalSize: number; // 重复文件总大小
}

// 从环境变量或 .env.local 读取配置
async function loadConfig() {
  // 尝试从 .env.local 读取
  try {
    const envContent = await readFile(join(process.cwd(), '.env.local'), 'utf-8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });

    return {
      bucket: envVars.OSS_BUCKET || process.env.OSS_BUCKET!,
      region: envVars.OSS_REGION || process.env.OSS_REGION!,
      accessKeyId: envVars.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: envVars.OSS_ACCESS_KEY_SECRET || process.env.OSS_ACCESS_KEY_SECRET!,
    };
  } catch (error) {
    // 如果读取失败，使用环境变量
    return {
      bucket: process.env.OSS_BUCKET!,
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    };
  }
}

function getOSSClient(config: Awaited<ReturnType<typeof loadConfig>>): OSS {
  return new OSS({
    region: config.region,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
  });
}

// 列出 OSS 中的所有文件
async function listAllFiles(
  client: OSS,
  config: Awaited<ReturnType<typeof loadConfig>>,
  prefix: string = 'assets/'
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  let marker: string | undefined;
  
  console.log(`📂 开始扫描 OSS 文件，前缀: ${prefix}`);
  
  do {
    try {
      const result = await client.list({
        prefix,
        marker,
        'max-keys': 1000,
      });
      
      if (result.objects && result.objects.length > 0) {
        for (const obj of result.objects) {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: `https://${config.bucket}.${config.region.replace('oss-', '')}.aliyuncs.com/${obj.name}`,
          });
        }
      }
      
      marker = result.nextMarker;
      console.log(`  已扫描 ${files.length} 个文件...`);
    } catch (error) {
      console.error('❌ 列出文件失败:', error);
      break;
    }
  } while (marker);
  
  console.log(`✅ 扫描完成，共找到 ${files.length} 个文件\n`);
  return files;
}

// 计算文件的 hash（需要下载文件）
async function calculateFileHash(client: OSS, fileName: string): Promise<string> {
  try {
    const result = await client.get(fileName);
    const hash = createHash('sha256');
    hash.update(result.content);
    return hash.digest('hex');
  } catch (error) {
    console.warn(`⚠️  计算文件 hash 失败: ${fileName}`, error);
    return '';
  }
}

// 从文件名提取基础名称（去除时间戳等）
function getBaseFileName(fileName: string): string {
  // 例如: assets/1234567890_filename.jpg -> filename.jpg
  const parts = fileName.split('/');
  const name = parts[parts.length - 1];
  
  // 如果文件名以时间戳开头，去除时间戳
  const timestampMatch = name.match(/^\d+_(.+)$/);
  if (timestampMatch) {
    return timestampMatch[1];
  }
  
  return name;
}

// 从 manifest.json 读取 hash 信息
async function loadManifestHashes(
  client: OSS,
  config: Awaited<ReturnType<typeof loadConfig>>
): Promise<Map<string, { url: string; assetName: string; assetId: string }>> {
  const hashMap = new Map<string, { url: string; assetName: string; assetId: string }>();
  
  try {
    console.log('📖 正在从 manifest.json 读取 hash 信息...');
    const result = await client.get('manifest.json');
    const manifest = JSON.parse(result.content.toString('utf-8'));
    
    if (manifest.assets && Array.isArray(manifest.assets)) {
      for (const asset of manifest.assets) {
        if (asset.hash && asset.src) {
          // 提取 OSS 路径（从完整 URL 或相对路径）
          let ossPath = asset.src;
          if (ossPath.startsWith('http')) {
            // 从完整 URL 提取路径
            const urlMatch = ossPath.match(/\/assets\/(.+)$/);
            if (urlMatch) {
              ossPath = `assets/${urlMatch[1]}`;
            } else {
              continue; // 无法解析路径，跳过
            }
          } else if (!ossPath.startsWith('assets/')) {
            ossPath = `assets/${ossPath.replace(/^\//, '')}`;
          }
          
          hashMap.set(asset.hash, {
            url: ossPath,
            assetName: asset.name || '未知',
            assetId: asset.id || '未知',
          });
        }
      }
    }
    
    console.log(`✅ 从 manifest.json 读取到 ${hashMap.size} 个文件的 hash 信息\n`);
  } catch (error: any) {
    if (error.code === 'NoSuchKey' || error.status === 404) {
      console.log('⚠️  manifest.json 不存在，将使用其他方法检测重复文件\n');
    } else {
      console.warn('⚠️  读取 manifest.json 失败:', error.message || error);
      console.log('   将使用其他方法检测重复文件\n');
    }
  }
  
  return hashMap;
}

// 查找重复文件
async function findDuplicates(
  files: FileInfo[],
  client: OSS,
  config: Awaited<ReturnType<typeof loadConfig>>,
  useHash: boolean = false,
  useManifestHash: boolean = true
): Promise<DuplicateGroup[]> {
  const matchMethod = useHash ? 'hash（下载计算）' : useManifestHash ? 'hash（从 manifest.json）' : '文件名+大小';
  console.log(`🔍 开始查找重复文件（使用 ${matchMethod} 匹配）...\n`);
  
  const groups = new Map<string, FileInfo[]>();
  
  // 方法1：从 manifest.json 读取 hash（最快最准确）
  if (useManifestHash && !useHash) {
    const manifestHashes = await loadManifestHashes(client, config);
    
    if (manifestHashes.size > 0) {
      // 建立文件路径到 hash 的映射（一个 hash 可能对应多个文件路径）
      const filePathToHash = new Map<string, string>();
      const hashToPaths = new Map<string, string[]>();
      
      for (const [hash, info] of manifestHashes.entries()) {
        filePathToHash.set(info.url, hash);
        if (!hashToPaths.has(hash)) {
          hashToPaths.set(hash, []);
        }
        hashToPaths.get(hash)!.push(info.url);
      }
      
      // 按 hash 分组（manifest 中有 hash 的文件）
      for (const file of files) {
        const hash = filePathToHash.get(file.name);
        if (hash) {
          file.hash = hash;
          if (!groups.has(hash)) {
            groups.set(hash, []);
          }
          groups.get(hash)!.push(file);
        }
      }
      
      // 对于没有在 manifest 中的文件，使用文件名+大小分组
      for (const file of files) {
        if (!file.hash) {
          const baseName = getBaseFileName(file.name);
          const key = `${baseName}_${file.size}`;
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key)!.push(file);
        }
      }
      
      console.log(`  使用 manifest.json 的 hash 匹配了 ${Array.from(groups.values()).filter(g => g[0].hash).length} 个文件组`);
      console.log(`  使用文件名+大小匹配了 ${Array.from(groups.values()).filter(g => !g[0].hash).length} 个文件组\n`);
    } else {
      // manifest.json 不存在或没有 hash，回退到文件名+大小
      console.log('  使用文件名+大小匹配（manifest.json 中没有 hash 信息）\n');
      for (const file of files) {
        const baseName = getBaseFileName(file.name);
        const key = `${baseName}_${file.size}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(file);
      }
    }
  }
  // 方法2：下载文件计算 hash（最准确但最慢）
  else if (useHash) {
    console.log('  正在计算文件 hash（这可能需要一些时间）...');
    let processed = 0;
    
    for (const file of files) {
      processed++;
      if (processed % 10 === 0) {
        console.log(`  已处理 ${processed}/${files.length} 个文件...`);
      }
      
      const hash = await calculateFileHash(client, file.name);
      if (hash) {
        file.hash = hash;
        const key = hash;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(file);
      }
    }
  }
  // 方法3：文件名+大小（快速但不准确）
  else {
    for (const file of files) {
      const baseName = getBaseFileName(file.name);
      const key = `${baseName}_${file.size}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(file);
    }
  }
  
  // 找出重复组
  const duplicates: DuplicateGroup[] = [];
  
  for (const [key, groupFiles] of groups.entries()) {
    if (groupFiles.length > 1) {
      // 按上传时间排序，保留最早的
      groupFiles.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
      
      duplicates.push({
        key,
        files: groupFiles,
        keepFile: groupFiles[0],
        deleteFiles: groupFiles.slice(1),
        totalSize: groupFiles.slice(1).reduce((sum, f) => sum + f.size, 0),
      });
    }
  }
  
  console.log(`✅ 找到 ${duplicates.length} 组重复文件\n`);
  return duplicates;
}

// 生成报告
function generateReport(duplicates: DuplicateGroup[]): void {
  console.log('='.repeat(80));
  console.log('📊 重复文件清理报告');
  console.log('='.repeat(80));
  console.log();
  
  if (duplicates.length === 0) {
    console.log('✅ 没有发现重复文件！');
    return;
  }
  
  const totalDuplicateFiles = duplicates.reduce((sum, g) => sum + g.deleteFiles.length, 0);
  const totalWastedSize = duplicates.reduce((sum, g) => sum + g.totalSize, 0);
  
  console.log(`📈 统计信息：`);
  console.log(`   - 重复文件组数: ${duplicates.length}`);
  console.log(`   - 可删除文件数: ${totalDuplicateFiles}`);
  console.log(`   - 可节省空间: ${formatSize(totalWastedSize)}`);
  console.log();
  
  console.log('📋 详细列表：\n');
  
  duplicates.forEach((group, index) => {
    console.log(`${index + 1}. 重复组: ${group.key}`);
    console.log(`   保留文件: ${group.keepFile.name} (${formatSize(group.keepFile.size)})`);
    console.log(`   删除文件:`);
    group.deleteFiles.forEach(file => {
      console.log(`     - ${file.name} (${formatSize(file.size)})`);
    });
    console.log(`   可节省: ${formatSize(group.totalSize)}`);
    console.log();
  });
  
  console.log('='.repeat(80));
}

// 删除重复文件
async function deleteDuplicates(
  client: OSS,
  duplicates: DuplicateGroup[],
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log('🔍 模拟模式：不会实际删除文件\n');
    return;
  }
  
  console.log('🗑️  开始删除重复文件...\n');
  
  let deletedCount = 0;
  let failedCount = 0;
  let totalSaved = 0;
  
  for (const group of duplicates) {
    for (const file of group.deleteFiles) {
      try {
        await client.delete(file.name);
        deletedCount++;
        totalSaved += file.size;
        console.log(`✅ 已删除: ${file.name}`);
      } catch (error) {
        failedCount++;
        console.error(`❌ 删除失败: ${file.name}`, error);
      }
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('📊 清理结果');
  console.log('='.repeat(80));
  console.log(`✅ 成功删除: ${deletedCount} 个文件`);
  console.log(`❌ 删除失败: ${failedCount} 个文件`);
  console.log(`💾 节省空间: ${formatSize(totalSaved)}`);
  console.log('='.repeat(80));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--delete');
  const useHash = args.includes('--hash');
  const useManifestHash = !args.includes('--no-manifest');
  
  console.log('🚀 OSS 重复文件清理工具\n');
  console.log(`模式: ${dryRun ? '🔍 扫描模式（不会删除文件）' : '⚠️  删除模式（将实际删除文件）'}`);
  
  let matchMethod = '文件名+大小匹配（快速但不准确）';
  if (useHash) {
    matchMethod = 'Hash 匹配（下载文件计算，准确但慢）';
  } else if (useManifestHash) {
    matchMethod = 'Hash 匹配（从 manifest.json 读取，快速且准确）';
  }
  console.log(`匹配方式: ${matchMethod}\n`);
  
  if (!dryRun) {
    console.log('⚠️  警告：您正在使用删除模式！');
    console.log('⚠️  这将永久删除重复文件，请确保已备份重要数据！\n');
    
    // 等待用户确认
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    await new Promise<void>((resolve) => {
      rl.question('请输入 "yes" 确认删除: ', (answer: string) => {
        rl.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log('❌ 已取消操作');
          process.exit(0);
        }
        resolve();
      });
    });
  }
  
  try {
    // 加载配置
    const config = await loadConfig();
    
    if (!config.bucket || !config.region || !config.accessKeyId || !config.accessKeySecret) {
      throw new Error('OSS 配置不完整，请检查环境变量或 .env.local 文件');
    }
    
    // 创建 OSS 客户端
    const client = getOSSClient(config);
    
    // 列出所有文件
    const files = await listAllFiles(client, config);
    
    if (files.length === 0) {
      console.log('✅ OSS 中没有文件');
      return;
    }
    
    // 查找重复文件
    const duplicates = await findDuplicates(files, client, config, useHash, !args.includes('--no-manifest'));
    
    // 生成报告
    generateReport(duplicates);
    
    // 删除重复文件（如果不是 dry-run）
    if (duplicates.length > 0) {
      await deleteDuplicates(client, duplicates, dryRun);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

