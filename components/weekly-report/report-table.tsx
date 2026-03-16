'use client';

import { useState, useCallback } from 'react';
import type { ReportMaterial } from '@/types/weekly-report';

interface ReportTableProps {
  materials: ReportMaterial[];
}

/**
 * 检测 URL 是否为视频
 */
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  // 检查文件扩展名
  if (videoExtensions.some(ext => lowerUrl.endsWith(ext))) {
    return true;
  }
  // 检查 URL 路径中是否包含视频关键词
  if (lowerUrl.includes('/video/') || lowerUrl.includes('video') || lowerUrl.includes('.mp4')) {
    return true;
  }
  return false;
}

/**
 * 检测 URL 是否为图片
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = url.toLowerCase();
  // 检查文件扩展名
  if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
    return true;
  }
  // 检查 URL 路径中是否包含图片关键词
  if (lowerUrl.includes('/image/') || lowerUrl.includes('/img/') || 
      lowerUrl.includes('/picture/') || lowerUrl.includes('/photo/') ||
      lowerUrl.includes('thumbnail') || lowerUrl.includes('preview') ||
      lowerUrl.includes('cover') || lowerUrl.includes('thumb')) {
    return true;
  }
  // 检查是否是常见的图片 CDN 域名
  const imageDomains = ['imgur.com', 'imgbb.com', 'cloudinary.com', 'unsplash.com', 
                        'pexels.com', 'pixabay.com', 'aliyuncs.com', 'obs.cn'];
  if (imageDomains.some(domain => lowerUrl.includes(domain))) {
    return true;
  }
  // 如果 URL 包含图片格式参数，也认为是图片
  if (lowerUrl.includes('format=jpg') || lowerUrl.includes('format=png') || 
      lowerUrl.includes('format=jpeg') || lowerUrl.includes('format=webp')) {
    return true;
  }
  return false;
}

/**
 * 媒体预览组件
 */
function MediaPreview({ url, onClick }: { url: string; onClick?: () => void }) {
  const [isHovering, setIsHovering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 优先判断是否为图片（因为封面链接通常是图片）
  const isImage = isImageUrl(url);
  const isVideo = !isImage && isVideoUrl(url);

  if (hasError) {
    return (
      <div className="w-20 h-20 flex items-center justify-center bg-muted/50 rounded border border-border text-muted-foreground text-xs">
        加载失败
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        className="relative w-20 h-20 rounded overflow-hidden border border-border cursor-pointer hover:border-border transition-colors duration-200"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={onClick}
      >
        <video
          src={url}
          muted
          playsInline
          autoPlay={isHovering}
          loop
          onError={() => setHasError(true)}
          onContextMenu={(e) => e.preventDefault()} // 禁用右键菜单
          controlsList="nodownload" // 隐藏下载控件
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div 
        className="relative w-20 h-20 rounded overflow-hidden border border-border cursor-pointer hover:border-border transition-colors duration-200"
        onClick={onClick}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}
        <img
          src={url}
          alt="预览"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          onContextMenu={(e) => e.preventDefault()} // 禁用右键菜单
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        />
      </div>
    );
  }

  // 如果无法判断类型，尝试作为图片加载
  return (
    <div 
      className="relative w-20 h-20 rounded overflow-hidden border border-border cursor-pointer hover:border-border transition-colors duration-200"
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      )}
      <img
        src={url}
        alt="预览"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs">
          不支持
        </div>
      )}
    </div>
  );
}

export function ReportTable({ materials }: ReportTableProps) {
  const formatNumber = useCallback((num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const formatCurrency = useCallback((num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }, []);

  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无数据
      </div>
    );
  }

  const formatPercentage = useCallback((num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    return `${num.toFixed(2)}%`;
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">素材名称</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">消耗</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">新增成本</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">付费成本</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">付费率</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">首日roi</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">3日roi</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">7日roi</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">累计roi</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">关联</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">预览</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr
              key={material.id || index}
              className="border-b border-border hover:bg-muted/50 transition-colors duration-200"
            >
              <td className="px-4 py-3 text-foreground text-sm max-w-xs">
                {(() => {
                  // 调试：输出媒体链接信息
                  if (process.env.NODE_ENV === 'development') {
                    if (material.mediaUrl) {
                      console.log(`[ReportTable] 素材 "${material.name}" 有媒体链接:`, material.mediaUrl);
                    } else {
                      console.log(`[ReportTable] 素材 "${material.name}" 无媒体链接`);
                    }
                  }
                  
                  if (material.mediaUrl) {
                    return (
                      <a
                        href={material.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-foreground hover:underline cursor-pointer truncate block"
                        title={`${material.name}\n点击打开视频: ${material.mediaUrl}`}
                        onClick={(e) => {
                          // 确保链接能正常打开
                          if (!material.mediaUrl) {
                            e.preventDefault();
                            return;
                          }
                          // 如果链接无效，尝试在新窗口打开
                          if (!material.mediaUrl.startsWith('http://') && !material.mediaUrl.startsWith('https://')) {
                            e.preventDefault();
                            console.warn('[ReportTable] 无效的视频链接:', material.mediaUrl);
                            return;
                          }
                          // Video link clicked
                        }}
                      >
                        {material.name || '-'}
                      </a>
                    );
                  } else {
                    return (
                      <span className="truncate block" title={material.name}>
                        {material.name || '-'}
                      </span>
                    );
                  }
                })()}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatCurrency(material.consumption)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatCurrency(material.newCost)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatCurrency(material.paidCost)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatPercentage(material.paymentRate)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatPercentage(material.firstDayRoi || material.roi)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatPercentage(material.day3Roi)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatPercentage(material.day7Roi)}
              </td>
              <td className="px-4 py-3 text-right text-foreground text-sm">
                {formatPercentage(material.cumulativeRoi)}
              </td>
              <td className="px-4 py-3 text-center text-sm">
                {material.material_id ? (
                  <a
                    href={`/materials/${material.material_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors"
                    title={`${material.match_type === 'exact' ? '精确' : '模糊'}匹配 (${Math.round((material.match_confidence || 0) * 100)}%)`}
                  >
                    ✓ {material.match_type === 'exact' ? '精确' : '模糊'}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {(() => {
                  // 调试：输出预览链接信息
                  if (process.env.NODE_ENV === 'development') {
                    if (material.previewUrl) {
                      console.log(`[ReportTable] 素材 "${material.name}" 有封面链接:`, material.previewUrl);
                    } else if (material.mediaUrl) {
                      console.log(`[ReportTable] 素材 "${material.name}" 有媒体链接:`, material.mediaUrl);
                    } else {
                      console.log(`[ReportTable] 素材 "${material.name}" 无预览链接`);
                    }
                  }
                  
                  if (material.previewUrl) {
                    return (
                      <MediaPreview 
                        url={material.previewUrl} 
                        onClick={material.mediaUrl ? () => {
                          if (material.mediaUrl) {
                            window.open(material.mediaUrl, '_blank', 'noopener,noreferrer');
                          }
                        } : undefined}
                      />
                    );
                  } else if (material.mediaUrl) {
                    return (
                      <MediaPreview 
                        url={material.mediaUrl}
                        onClick={() => {
                          if (material.mediaUrl) {
                            window.open(material.mediaUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      />
                    );
                  } else {
                    return <span className="text-muted-foreground text-xs">-</span>;
                  }
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
