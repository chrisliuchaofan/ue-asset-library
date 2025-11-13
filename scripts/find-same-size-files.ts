#!/usr/bin/env tsx
/**
 * 查找 OSS 中相同大小的文件
 * 用于手动检查可能的重复文件
 */

import OSS from 'ali-oss';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface FileInfo {
  name: string;
  size: number;
  lastModified: Date;
}

async function loadConfig() {
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

async function listAllFiles(
  client: OSS,
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
            lastModified: obj.lastModified instanceof Date 
              ? obj.lastModified 
              : new Date(obj.lastModified),
          });
        }
      }
      
      marker = result.nextMarker;
      if (files.length % 1000 === 0) {
        console.log(`  已扫描 ${files.length} 个文件...`);
      }
    } catch (error) {
      console.error('❌ 列出文件失败:', error);
      break;
    }
  } while (marker);
  
  console.log(`✅ 扫描完成，共找到 ${files.length} 个文件\n`);
  return files;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function main() {
  console.log('🔍 OSS 相同大小文件查找工具\n');
  
  try {
    const config = await loadConfig();
    
    if (!config.bucket || !config.region || !config.accessKeyId || !config.accessKeySecret) {
      throw new Error('OSS 配置不完整，请检查环境变量或 .env.local 文件');
    }
    
    const client = getOSSClient(config);
    const files = await listAllFiles(client);
    
    if (files.length === 0) {
      console.log('✅ OSS 中没有文件');
      return;
    }
    
    // 按大小分组
    console.log('🔍 按文件大小分组...\n');
    const sizeGroups = new Map<number, FileInfo[]>();
    
    for (const file of files) {
      if (!sizeGroups.has(file.size)) {
        sizeGroups.set(file.size, []);
      }
      sizeGroups.get(file.size)!.push(file);
    }
    
    // 找出相同大小的文件组（超过1个文件的组）
    const sameSizeGroups: Array<{ size: number; files: FileInfo[] }> = [];
    
    for (const [size, groupFiles] of sizeGroups.entries()) {
      if (groupFiles.length > 1) {
        // 按上传时间排序
        groupFiles.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
        sameSizeGroups.push({ size, files: groupFiles });
      }
    }
    
    // 按组大小排序（文件数量多的在前）
    sameSizeGroups.sort((a, b) => b.files.length - a.files.length);
    
    console.log('='.repeat(80));
    console.log('📊 相同大小文件报告');
    console.log('='.repeat(80));
    console.log();
    
    if (sameSizeGroups.length === 0) {
      console.log('✅ 没有发现相同大小的文件组');
      return;
    }
    
    console.log(`📈 统计信息：`);
    console.log(`   - 相同大小文件组数: ${sameSizeGroups.length}`);
    console.log(`   - 涉及文件总数: ${sameSizeGroups.reduce((sum, g) => sum + g.files.length, 0)}`);
    console.log();
    
    // 显示前20组（最多）
    const displayGroups = sameSizeGroups.slice(0, 20);
    
    console.log('📋 详细列表（显示前20组）：\n');
    
    displayGroups.forEach((group, index) => {
      console.log(`${index + 1}. 文件大小: ${formatSize(group.size)} (${group.files.length} 个文件)`);
      group.files.forEach((file, fileIndex) => {
        const fileName = file.name.split('/').pop() || file.name;
        const date = file.lastModified.toISOString().split('T')[0];
        console.log(`   ${fileIndex + 1}. ${fileName} (${date})`);
      });
      console.log();
    });
    
    if (sameSizeGroups.length > 20) {
      console.log(`... 还有 ${sameSizeGroups.length - 20} 组未显示`);
      console.log();
    }
    
    console.log('='.repeat(80));
    console.log('💡 提示：');
    console.log('   - 这些文件大小相同，但可能是不同的文件');
    console.log('   - 如果确认是重复文件，可以使用清理脚本删除');
    console.log('   - 建议先检查文件内容是否真的相同');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

