'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useEffect, useRef, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import { MaterialCardGallery } from '@/components/material-card-gallery';
import { ModuleEmptyState } from '@/components/empty-states/ModuleEmptyState';
import { Library, Upload } from 'lucide-react';
import { type Material, MATERIAL_STATUS_LABELS, MATERIAL_STATUS_COLORS } from '@/data/material.schema';
import { PAGINATION } from '@/lib/constants';
import { getProjectDisplayName } from '@/lib/constants';

type ThumbSize = 'compact' | 'expanded' | 'list';

interface MaterialsListProps {
  materials: Material[];
  thumbSize?: ThumbSize;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  batchMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function MaterialsListContent({ materials, thumbSize = 'compact', scrollContainerRef, batchMode, selectedIds, onToggleSelect }: MaterialsListProps) {
  // 性能优化：使用虚拟滚动替代分页，支持大量素材
  if (materials.length === 0) {
    return (
      <ModuleEmptyState
        icon={Library}
        iconColor="text-blue-400/60"
        title="还没有素材"
        description="上传你的第一个广告素材，开始管理和优化你的创意资产"
        actions={[
          { label: '上传素材', href: '/materials', variant: 'primary' },
          { label: '体验 AI 创作', href: '/studio', variant: 'secondary' },
        ]}
      />
    );
  }

  // 列表视图模式
  if (thumbSize === 'list') {
    return (
      <MaterialsListView materials={materials} scrollContainerRef={scrollContainerRef} batchMode={batchMode} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
    );
  }

  // 根据 thumbSize 计算卡片宽度（与 MaterialCardGallery 中的 actualCardWidth 保持一致）
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    
    // 性能优化：使用防抖处理 resize 事件
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedCheckMobile = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        checkMobile();
      }, 150);
    };
    
    window.addEventListener('resize', debouncedCheckMobile, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedCheckMobile);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);
  
  const cardWidth = useMemo(() => {
    if (isMobile) {
      return thumbSize === 'compact' ? 140 : 240;
    }
    return thumbSize === 'compact' ? 180 : 320;
  }, [thumbSize, isMobile]);

  // 计算列数和间距（参考资产页面的实现）
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    
    // 性能优化：使用防抖处理 resize 事件
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedUpdateWidth = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        updateWidth();
      }, 150);
    };
    
    window.addEventListener('resize', debouncedUpdateWidth, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedUpdateWidth);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const { columns, horizontalGap } = useMemo(() => {
    if (!isMounted || containerWidth === 0) {
      // 默认值 - 移动端使用更小的默认宽度
      const defaultAvailableWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 375 - 16 : 1920 - 48; // 移动端减去左右padding 8px，桌面端减去48px
      const minGap = 8;
      const defaultMaxColumns = Math.floor((defaultAvailableWidth + minGap) / (cardWidth + minGap));
      return {
        columns: Math.max(1, defaultMaxColumns),
        horizontalGap: minGap
      };
    }

    // 移动端使用更小的 padding
    const containerPadding = typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 48; // 移动端左右各8px，桌面端左右各24px
    const minGap = 8;
    const availableWidth = containerWidth - containerPadding;
    
    // 计算最多能放多少个卡片
    const maxColumns = Math.floor((availableWidth + minGap) / (cardWidth + minGap));
    const calculatedColumns = Math.max(1, maxColumns);
    
    // 计算间距：尽量平均分配剩余空间
    const totalCardWidth = calculatedColumns * cardWidth;
    const remainingForGap = availableWidth - totalCardWidth;
    let actualGap = minGap;
    if (calculatedColumns > 1 && remainingForGap > 0) {
      actualGap = Math.min(12, Math.floor(remainingForGap / (calculatedColumns - 1)));
    }
    
    return {
      columns: calculatedColumns,
      horizontalGap: actualGap
    };
  }, [isMounted, containerWidth, cardWidth]);

  const verticalGap = 12;
  
  // 计算行数和每行高度
  const rowCount = useMemo(
    () => Math.ceil(materials.length / columns),
    [materials.length, columns]
  );

  // 估算每行高度（根据卡片高度 + 垂直间距）
  const estimatedRowHeight = useMemo(() => {
    // 根据 thumbSize 估算卡片高度
    const cardHeight = thumbSize === 'compact' 
      ? (isMobile ? 200 : 240)  // 紧凑模式：预览区域 + 文字区域
      : (isMobile ? 320 : 380); // 展开模式
    return cardHeight + verticalGap;
  }, [thumbSize, isMobile, verticalGap]);

  // 虚拟滚动
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => estimatedRowHeight,
    // 性能优化：减少 overscan，降低初始渲染的 DOM 节点数量
    overscan: PAGINATION.VIRTUAL_SCROLL_OVERSCAN,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  // 渲染一行卡片
  const renderGridRow = (rowIndex: number) => {
    const startIndex = rowIndex * columns;
    const endIndex = Math.min(startIndex + columns, materials.length);
    const rowMaterials = materials.slice(startIndex, endIndex);

    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap: `${verticalGap}px ${horizontalGap}px`,
        }}
      >
        {rowMaterials.map((material, colIndex) => {
          const globalIndex = startIndex + colIndex;
          return (
            <MaterialCardGallery
              key={material.id}
              material={material}
              priority={globalIndex < PAGINATION.PRIORITY_IMAGES_COUNT}
              thumbSize={thumbSize}
              batchMode={batchMode}
              isSelected={selectedIds?.has(material.id)}
              onToggleSelect={onToggleSelect}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: '60vh' }}>
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              paddingBottom: verticalGap,
            }}
          >
            {renderGridRow(virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 列表视图组件 - 以表格形式展示素材
function MaterialsListView({ materials, scrollContainerRef, batchMode, selectedIds, onToggleSelect }: { materials: Material[]; scrollContainerRef?: RefObject<HTMLDivElement | null>; batchMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void }) {
  const ROW_HEIGHT = 56;

  const rowVirtualizer = useVirtualizer({
    count: materials.length,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  function formatDate(ts?: number): string {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatConsumption(value?: number): string {
    if (value === undefined || value === null) return '-';
    if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
    return value.toLocaleString('zh-CN');
  }

  return (
    <div className="relative" style={{ minHeight: '60vh' }}>
      {/* 表头 */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="grid grid-cols-[1fr_80px_80px_80px_80px_64px_100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>素材名称</div>
          <div>类型</div>
          <div>项目</div>
          <div>标签</div>
          <div>状态</div>
          <div className="text-right">消耗</div>
          <div className="text-right">日期</div>
        </div>
      </div>
      {/* 虚拟列表 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualRows.map((virtualRow) => {
          const m = materials[virtualRow.index];
          const status = (m.status || 'draft') as string;
          const statusColor = MATERIAL_STATUS_COLORS[status] || 'text-muted-foreground bg-muted';
          const isSelected = selectedIds?.has(m.id);

          if (batchMode) {
            return (
              <div
                key={m.id}
                className={`absolute left-0 w-full px-3 flex items-center hover:bg-muted/50 transition-colors border-b border-border/50 group cursor-pointer ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                style={{
                  top: 0,
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onToggleSelect?.(m.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {isSelected && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="grid grid-cols-[1fr_80px_80px_80px_80px_64px_100px] gap-2 flex-1 items-center text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.thumbnail && (
                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                          <img src={m.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <span className="truncate text-foreground">{m.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.type}</div>
                    <div className="text-xs text-muted-foreground truncate">{getProjectDisplayName(m.project) || m.project}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.tag}</div>
                    <div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}`}>
                        {MATERIAL_STATUS_LABELS[status] || status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">{formatConsumption(m.consumption)}</div>
                    <div className="text-xs text-muted-foreground text-right">{formatDate(m.createdAt)}</div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={m.id}
              href={`/materials/${m.id}`}
              className="absolute left-0 w-full px-3 flex items-center hover:bg-muted/50 transition-colors border-b border-border/50 group"
              style={{
                top: 0,
                height: ROW_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_64px_100px] gap-2 w-full items-center text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {m.thumbnail && (
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                      <img src={m.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <span className="truncate text-foreground group-hover:text-primary transition-colors">{m.name}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{m.type}</div>
                <div className="text-xs text-muted-foreground truncate">{getProjectDisplayName(m.project) || m.project}</div>
                <div className="text-xs text-muted-foreground truncate">{m.tag}</div>
                <div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}`}>
                    {MATERIAL_STATUS_LABELS[status] || status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right">{formatConsumption(m.consumption)}</div>
                <div className="text-xs text-muted-foreground text-right">{formatDate(m.createdAt)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MaterialsList({ materials, thumbSize = 'compact', scrollContainerRef, batchMode, selectedIds, onToggleSelect }: MaterialsListProps) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <MaterialsListContent
        materials={materials}
        thumbSize={thumbSize}
        scrollContainerRef={scrollContainerRef}
        batchMode={batchMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
      />
    </Suspense>
  );
}

