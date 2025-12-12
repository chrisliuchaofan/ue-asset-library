import { getAssetById } from '@/lib/data';
import { getOSSClient } from '@/lib/oss-client';
import sharp from 'sharp';

/**
 * 资产解析结果
 */
export interface ResolvedAsset {
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  data: Buffer; // 原始数据或处理后的数据
  base64: string; // Base64 字符串（带前缀）
  url?: string; // 签名 URL（可选）
}

/**
 * 资产解析选项
 */
export interface ResolveOptions {
  width?: number; // 图片宽度限制
  quality?: number; // 图片质量
  format?: 'jpeg' | 'png' | 'webp'; // 输出格式
  maxSize?: number; // 最大文件大小 (bytes)，超过报错
}

/**
 * 解析资产用于 AI 输入
 * - 验证资产存在性和权限
 * - 从 OSS 拉取数据
 * - 图片自动压缩/下采样
 * - 返回 Base64 或 Buffer
 */
export async function resolveAssetForAI(
  assetId: string, 
  options: ResolveOptions = {}
): Promise<ResolvedAsset> {
  const { 
    width = 1024, 
    quality = 80, 
    format = 'jpeg',
    maxSize = 10 * 1024 * 1024 // 默认限制 10MB
  } = options;
  
  // 1. 获取资产元数据
  const asset = await getAssetById(assetId);
  if (!asset) {
    throw new Error(`资产不存在: ${assetId}`);
  }
  
  // 2. 检查 OSS 路径
  const ossPath = asset.src || asset.thumbnail;
  if (!ossPath) {
    throw new Error('资产路径为空');
  }
  
  // 3. 从 OSS 获取数据流
  // 注意：这里需要去除开头的 / (如果存在)
  const cleanPath = ossPath.startsWith('/') ? ossPath.substring(1) : ossPath;
  const client = getOSSClient();
  
  try {
    const result = await client.get(cleanPath);
    const buffer = result.content as Buffer;
    
    if (buffer.length > maxSize) {
       // 如果是图片，尝试压缩；如果是其他文件，直接报错
       if (!isImage(ossPath)) {
         throw new Error(`文件过大 (${(buffer.length / 1024 / 1024).toFixed(2)}MB)，且无法压缩`);
       }
    }
    
    // 4. 处理图片 (使用 sharp)
    if (isImage(ossPath)) {
      let pipeline = sharp(buffer);
      
      // 获取元数据
      const metadata = await pipeline.metadata();
      
      // 如果宽度超过限制，进行 resize
      if (metadata.width && metadata.width > width) {
        pipeline = pipeline.resize(width, null, { withoutEnlargement: true });
      }
      
      // 转换格式和质量
      if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality });
      } else if (format === 'png') {
        pipeline = pipeline.png({ quality });
      } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      }
      
      const processedBuffer = await pipeline.toBuffer();
      const mimeType = `image/${format}`;
      const base64 = `data:${mimeType};base64,${processedBuffer.toString('base64')}`;
      
      return {
        type: 'image',
        mimeType,
        data: processedBuffer,
        base64
      };
    } 
    
    // 非图片处理 (暂不支持)
    throw new Error('目前仅支持图片资产用于 AI 输入');
    
  } catch (error) {
    console.error('[AssetResolver] 解析失败:', error);
    throw new Error(`资产解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function isImage(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

