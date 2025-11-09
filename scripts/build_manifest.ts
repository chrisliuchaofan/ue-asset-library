import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { writeFileSync } from 'fs';
import sharp from 'sharp';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const DEMO_DIR = join(process.cwd(), 'public', 'demo');
const MANIFEST_PATH = join(process.cwd(), 'data', 'manifest.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

interface AssetInfo {
  id: string;
  name: string;
  type: 'image' | 'video';
  tags: string[];
  thumbnail: string;
  src: string;
  filesize?: number;
  width?: number;
  height?: number;
  duration?: number;
}

async function getVideoDuration(filePath: string): Promise<number | undefined> {
  // 简单的实现：尝试从文件名或元数据中获取
  // 实际项目中可以使用 ffprobe 等工具
  // 这里返回 undefined，让用户手动填写或使用其他工具
  return undefined;
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(filePath).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
  } catch (error) {
    console.warn(`无法读取图片尺寸: ${filePath}`, error);
  }
  return null;
}

async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

function extractTagsFromFilename(filename: string): string[] {
  // 从文件名中提取标签，例如：asset_自然_风景.jpg -> ['自然', '风景']
  const nameWithoutExt = basename(filename, extname(filename));
  const parts = nameWithoutExt.split('_').filter(Boolean);
  // 假设标签在文件名中以下划线分隔，且不是第一个部分（第一个是名称）
  if (parts.length > 1) {
    return parts.slice(1);
  }
  return [];
}

function generateId(filename: string, index: number): string {
  const nameWithoutExt = basename(filename, extname(filename));
  // 生成一个简单的 ID
  return nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-') || `asset-${index}`;
}

async function scanDirectory(dir: string): Promise<AssetInfo[]> {
  const assets: AssetInfo[] = [];
  let index = 0;

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = join(dir, entry.name);
        const ext = extname(entry.name).toLowerCase();
        const relativePath = `/demo/${entry.name}`;

        let assetType: 'image' | 'video' | null = null;
        if (IMAGE_EXTENSIONS.includes(ext)) {
          assetType = 'image';
        } else if (VIDEO_EXTENSIONS.includes(ext)) {
          assetType = 'video';
        }

        if (assetType) {
          index++;
          const filesize = await getFileSize(filePath);
          const tags = extractTagsFromFilename(entry.name);
          const name = basename(entry.name, ext);

          const asset: AssetInfo = {
            id: generateId(entry.name, index),
            name: name,
            type: assetType,
            tags: tags.length > 0 ? tags : ['未分类'],
            thumbnail: relativePath, // 对于视频，可以后续生成缩略图
            src: relativePath,
            filesize,
          };

          if (assetType === 'image') {
            const dimensions = await getImageDimensions(filePath);
            if (dimensions) {
              asset.width = dimensions.width;
              asset.height = dimensions.height;
            }
          } else if (assetType === 'video') {
            // 视频时长需要额外工具，这里留空
            // asset.duration = await getVideoDuration(filePath);
          }

          assets.push(asset);
          console.log(`处理: ${entry.name} (${assetType})`);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败: ${dir}`, error);
  }

  return assets;
}

async function main() {
  console.log('开始扫描资源...');
  console.log(`目录: ${DEMO_DIR}`);

  const assets = await scanDirectory(DEMO_DIR);

  if (assets.length === 0) {
    console.warn('未找到任何资源文件');
    return;
  }

  const manifest = {
    assets: assets.sort((a, b) => a.name.localeCompare(b.name)),
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n完成！生成 ${assets.length} 个资产记录`);
  console.log(`清单文件: ${MANIFEST_PATH}`);
}

main().catch(console.error);



