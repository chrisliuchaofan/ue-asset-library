'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MediaGallery } from '@/components/media-gallery';
import { formatFileSize, formatDuration } from '@/lib/utils';
import { type Material } from '@/data/material.schema';

interface MaterialDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
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

export function MaterialDetailDialog({ open, onOpenChange, material }: MaterialDetailDialogProps) {
  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{material.name}</DialogTitle>
          <DialogDescription>
            查看素材详细信息，包括预览图、标签和元数据
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 标签 */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{material.type}</Badge>
            <Badge variant="secondary">{material.tag}</Badge>
            {material.quality.map((q) => (
              <Badge key={q} variant="outline">
                {q}
              </Badge>
            ))}
          </div>

          {/* 素材信息 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">素材类型</div>
              <div className="font-medium">{material.type}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">标签</div>
              <div className="font-medium">{material.tag}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">质量</div>
              <div className="font-medium">{material.quality.join(', ')}</div>
            </div>
            {!isVideoUrl(material.src) && material.width && material.height && (
              <div>
                <div className="text-sm text-muted-foreground">尺寸</div>
                <div className="font-medium">
                  {material.width} × {material.height} 像素
                </div>
              </div>
            )}
            {isVideoUrl(material.src) && material.duration && (
              <div>
                <div className="text-sm text-muted-foreground">时长</div>
                <div className="font-medium">{formatDuration(material.duration)}</div>
              </div>
            )}
            {material.filesize && (
              <div>
                <div className="text-sm text-muted-foreground">文件大小</div>
                <div className="font-medium">{formatFileSize(material.filesize)}</div>
              </div>
            )}
          </div>

          {/* 媒体画廊 */}
          <div className="rounded-lg border bg-card p-4">
            <MediaGallery asset={material as any} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}





