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

export function HeaderActions({ selectedAssets = [], onRemoveAsset, onClearAssets }: HeaderActionsProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {selectedAssets.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => setShowCartDialog(true)}
            title="购物车"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {selectedAssets.length}
            </span>
            <span className="sr-only">购物车</span>
          </Button>
        )}
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
      {selectedAssets.length > 0 && onRemoveAsset && onClearAssets && (
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


