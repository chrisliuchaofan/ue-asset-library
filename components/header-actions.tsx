'use client';

import { useState, lazy, Suspense } from 'react';
import Link from 'next/link';
import { ShoppingCart, Home, Library, Box } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { OfficeSelector } from '@/components/office-selector';

// 动态导入 CartDialog，只在需要时加载
const CartDialog = lazy(() => import('@/components/cart-dialog').then(mod => ({ default: mod.CartDialog })));
import type { Asset } from '@/data/manifest.schema';
import type { OfficeLocation } from '@/lib/nas-utils';
import { usePathname } from 'next/navigation';

interface HeaderActionsProps {
  selectedAssets?: Asset[];
  onRemoveAsset?: (assetId: string) => void;
  onClearAssets?: () => void;
  officeLocation: OfficeLocation;
  onOfficeChange: (office: OfficeLocation) => void;
}

const navButtonBase =
  'relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-slate-100 dark:focus-visible:ring-primary/40 cursor-pointer';

export function HeaderActions({
  selectedAssets = [],
  onRemoveAsset,
  onClearAssets,
  officeLocation,
  onOfficeChange,
}: HeaderActionsProps) {
  const [showCartDialog, setShowCartDialog] = useState(false);
  const pathname = usePathname();
  const onAssetsPage = pathname?.startsWith('/assets');
  const onMaterialsPage = pathname?.startsWith('/materials');
  const showSwitchButton = onAssetsPage || onMaterialsPage;
  const showOfficeSelector = onAssetsPage;
  const switchTarget = onAssetsPage ? '/materials' : '/assets';
  const switchLabel = onAssetsPage ? '去素材页' : '去资产页';
  // 使用首页的图标：去资产页用 Library，去素材页用 Box
  const SwitchIcon = onAssetsPage ? Box : Library;

  const hasCart = onRemoveAsset && onClearAssets;
  const cartCount = selectedAssets.length;

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {showOfficeSelector && <OfficeSelector value={officeLocation} onChange={onOfficeChange} />}

        {hasCart && (
          <button
            type="button"
            className={`${navButtonBase} hover:bg-slate-100 dark:hover:bg-white/[0.08]`}
            onClick={() => setShowCartDialog(true)}
            title={cartCount > 0 ? `我的清单 (${cartCount})` : '我的清单'}
            aria-label="我的清单"
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground sm:text-xs">
                {cartCount}
              </span>
            )}
          </button>
        )}

        <ThemeToggle className={navButtonBase} />

        {showSwitchButton && (
          <Link
            href={switchTarget}
            className={`${navButtonBase} hover:bg-slate-100 dark:hover:bg-white/[0.08]`}
            title={switchLabel}
            aria-label={switchLabel}
          >
            <SwitchIcon className="h-4 w-4" />
          </Link>
        )}

        <Link
          href="/"
          className={`${navButtonBase} hover:bg-slate-100 dark:hover:bg-white/[0.08]`}
          title="返回首页"
          aria-label="返回首页"
        >
          <Home className="h-4 w-4" />
        </Link>
      </div>

      {hasCart && (
        <Suspense fallback={null}>
          <CartDialog
            open={showCartDialog}
            onOpenChange={setShowCartDialog}
            selectedAssets={selectedAssets}
            onRemove={onRemoveAsset}
            onClear={onClearAssets}
          />
        </Suspense>
      )}
    </>
  );
}


