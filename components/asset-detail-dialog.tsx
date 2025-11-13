'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MediaGallery } from '@/components/media-gallery';
import { formatFileSize, formatDuration } from '@/lib/utils';
import { type Asset } from '@/data/manifest.schema';

interface AssetDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}

// 判断 URL 是否为视频
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('.mp4') ||
    lowerUrl.includes('.webm') ||
    lowerUrl.includes('.mov') ||
    lowerUrl.includes('.avi') ||
    lowerUrl.includes('.mkv')
  );
}

export function AssetDetailDialog({ open, onOpenChange, asset }: AssetDetailDialogProps) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{asset.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 标签 */}
          <div className="flex flex-wrap gap-2">
            {(() => {
              const tagsArray = Array.isArray(asset.tags)
                ? asset.tags
                : typeof (asset as any).tags === 'string'
                ? (asset as any).tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : [];
              return tagsArray.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ));
            })()}
          </div>

          {/* 资产信息 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">资产类型</div>
              <div className="font-medium">{asset.type}</div>
            </div>
            {asset.style && (
              <div>
                <div className="text-sm text-muted-foreground">风格</div>
                <div className="font-medium">
                  {Array.isArray(asset.style)
                    ? asset.style.join(', ')
                    : asset.style}
                </div>
              </div>
            )}
            {asset.source && (
              <div>
                <div className="text-sm text-muted-foreground">来源</div>
                <div className="font-medium">{asset.source}</div>
              </div>
            )}
            {asset.engineVersion && (
              <div>
                <div className="text-sm text-muted-foreground">版本</div>
                <div className="font-medium">{asset.engineVersion}</div>
              </div>
            )}
            {!isVideoUrl(asset.src) && asset.width && asset.height && (
              <div>
                <div className="text-sm text-muted-foreground">尺寸</div>
                <div className="font-medium">
                  {asset.width} × {asset.height} 像素
                </div>
              </div>
            )}
            {isVideoUrl(asset.src) && asset.duration && (
              <div>
                <div className="text-sm text-muted-foreground">时长</div>
                <div className="font-medium">{formatDuration(asset.duration)}</div>
              </div>
            )}
            {asset.filesize && (
              <div>
                <div className="text-sm text-muted-foreground">文件大小</div>
                <div className="font-medium">{formatFileSize(asset.filesize)}</div>
              </div>
            )}
          </div>

          {/* 媒体画廊 */}
          <div className="rounded-lg border bg-card p-4">
            <MediaGallery asset={asset} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

