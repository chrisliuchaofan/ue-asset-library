import { type Asset } from '@/data/manifest.schema';

// 办公地类型
export type OfficeLocation = 'guangzhou' | 'shenzhen';

// NAS 基础路径配置
const NAS_BASE_PATHS: Record<OfficeLocation, string> = {
  guangzhou: '\\\\172.16.81.234\\GameAD_Assets\\GZ_UE',
  shenzhen: '\\\\172.16.41.227\\hx\\gz_hengxing_1\\GameAD_Assets\\GZ_UE',
};

// 类型到路径的映射（根据实际需求调整）
const TYPE_PATH_MAP: Record<string, string> = {
  '角色': 'mesh',
  '场景': 'mesh',
  '动画': 'animation',
  '特效': 'effects',
  '材质': 'materials',
  '蓝图': 'blueprints',
  'UI': 'ui',
  '合成': 'composite',
  '音频': 'audio',
  '其他': 'mesh',
};

/**
 * 根据资产生成 NAS 路径
 * 格式：\TU_project\content\mesh\类型\资产名称
 */
export function generateNasPath(asset: Asset): string {
  // 如果资产有 nasPath 字段，直接使用
  if ((asset as any).nasPath) {
    return (asset as any).nasPath;
  }

  // 否则根据类型和名称自动生成
  const typePath = TYPE_PATH_MAP[asset.type] || 'mesh';
  // 清理资产名称，移除特殊字符，保留中文、英文、数字、下划线、连字符
  const sanitizedName = asset.name.replace(/[^\w\u4e00-\u9fa5\-_]/g, '');
  
  return `\\TU_project\\content\\${typePath}\\${asset.type}\\${sanitizedName}`;
}

/**
 * 获取完整的 NAS 路径（包含基础路径）
 */
export function getFullNasPath(asset: Asset, office: OfficeLocation): string {
  const basePath = NAS_BASE_PATHS[office];
  const relativePath = generateNasPath(asset);
  return `${basePath}${relativePath}`;
}

/**
 * 导出选中资产的 NAS 路径到 CSV
 */
export function exportNasPathsToCSV(assets: Asset[], office: OfficeLocation): void {
  const csvRows: string[] = [];
  
  // CSV 头部
  csvRows.push('资产名称,广州NAS路径,深圳NAS路径');
  
  // 数据行
  assets.forEach(asset => {
    const guangzhouPath = getFullNasPath(asset, 'guangzhou');
    const shenzhenPath = getFullNasPath(asset, 'shenzhen');
    // CSV 转义：如果包含逗号或引号，需要用引号包裹，并转义内部引号
    const name = asset.name.includes(',') || asset.name.includes('"')
      ? `"${asset.name.replace(/"/g, '""')}"`
      : asset.name;
    csvRows.push(`${name},${guangzhouPath},${shenzhenPath}`);
  });
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // 添加 BOM 以支持 Excel 中文
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nas-paths-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 打开 NAS 路径（Windows 文件资源管理器）
 */
export function openNasPath(asset: Asset, office: OfficeLocation): void {
  const fullPath = getFullNasPath(asset, office);
  // Windows 路径格式：\\server\share\path
  // 在浏览器中，可以使用 file:// 协议，但 Windows 文件资源管理器更常用
  // 这里使用 window.open 尝试打开，实际效果取决于系统配置
  window.open(`file:///${fullPath.replace(/\\/g, '/')}`, '_blank');
  
  // 或者尝试使用自定义协议（如果系统支持）
  // window.location.href = `file:///${fullPath.replace(/\\/g, '/')}`;
}

/**
 * 复制 NAS 路径到剪贴板
 */
export async function copyNasPathToClipboard(asset: Asset, office: OfficeLocation): Promise<void> {
  const fullPath = getFullNasPath(asset, office);
  try {
    await navigator.clipboard.writeText(fullPath);
  } catch (err) {
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea');
    textArea.value = fullPath;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}


