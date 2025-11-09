'use client';

import { useState } from 'react';
import { Settings, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { AdminPasswordDialog } from '@/components/admin-password-dialog';
import { CartDialog } from '@/components/cart-dialog';
import { OfficeSelector } from '@/components/office-selector';
import type { OfficeLocation } from '@/lib/nas-utils';
import type { Asset } from '@/data/manifest.schema';

interface HeaderActionsProps {
  selectedAssets?: Asset[];
  onRemoveAsset?: (assetId: string) => void;
  onClearAssets?: () => void;
  officeLocation?: OfficeLocation;
  onOfficeLocationChange?: (office: OfficeLocation) => void;
}

export function HeaderActions({ 
  selectedAssets = [], 
  onRemoveAsset, 
  onClearAssets,
  officeLocation: propOfficeLocation,
  onOfficeLocationChange: propOnOfficeLocationChange,
}: HeaderActionsProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  
  // 如果通过 props 传入，使用 props；否则使用内部状态
  const [internalOfficeLocation, setInternalOfficeLocation] = useState<OfficeLocation>('guangzhou');
  const officeLocation = propOfficeLocation ?? internalOfficeLocation;
  const setOfficeLocation = propOnOfficeLocationChange ?? setInternalOfficeLocation;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 办公地选择器 */}
        <OfficeSelector value={officeLocation} onChange={setOfficeLocation} />
        {/* 我的清单图标 - 始终显示 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          onClick={() => setShowCartDialog(true)}
          title={selectedAssets.length > 0 ? `我的清单 (${selectedAssets.length})` : "我的清单"}
        >
          <ShoppingCart className="h-4 w-4" />
          {selectedAssets.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
              {selectedAssets.length}
            </span>
          )}
          <span className="sr-only">我的清单</span>
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setShowPasswordDialog(true)}
          title="管理后台"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">管理后台</span>
        </Button>
      </div>
      <AdminPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
      />
      {onRemoveAsset && onClearAssets && (
        <CartDialog
          open={showCartDialog}
          onOpenChange={setShowCartDialog}
          selectedAssets={selectedAssets}
          onRemove={onRemoveAsset}
          onClear={onClearAssets}
        />
      )}
    </>
  );
}


