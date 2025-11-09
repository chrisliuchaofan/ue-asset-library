'use client';

import { useState } from 'react';
import { Settings, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { AdminPasswordDialog } from '@/components/admin-password-dialog';
import { CartDialog } from '@/components/cart-dialog';
import type { Asset } from '@/data/manifest.schema';

interface HeaderActionsProps {
  selectedAssets?: Asset[];
  onRemoveAsset?: (assetId: string) => void;
  onClearAssets?: () => void;
}

export function HeaderActions({ 
  selectedAssets = [], 
  onRemoveAsset, 
  onClearAssets,
}: HeaderActionsProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* 我的清单图标 - 仅在提供 onRemoveAsset 和 onClearAssets 时显示 */}
        {onRemoveAsset && onClearAssets && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 relative"
            onClick={() => setShowCartDialog(true)}
            title={selectedAssets.length > 0 ? `我的清单 (${selectedAssets.length})` : "我的清单"}
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {selectedAssets.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs flex items-center justify-center font-medium">
                {selectedAssets.length}
              </span>
            )}
            <span className="sr-only">我的清单</span>
          </Button>
        )}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9"
          onClick={() => setShowPasswordDialog(true)}
          title="管理后台"
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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


