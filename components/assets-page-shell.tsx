"use client";

import { Suspense } from "react";
import { AssetsListWithSelection } from "@/components/assets-list-with-selection";
import { AssetsListSkeleton } from "@/components/assets-list";
import type { Asset } from "@/data/manifest.schema";

interface AssetsPageShellProps {
  assets: Asset[];
}

export function AssetsPageShell({ assets }: AssetsPageShellProps) {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      background: '#000',
    }}>
      <div style={{ padding: '16px 24px' }}>
        <Suspense fallback={<AssetsListSkeleton />}>
          <AssetsListWithSelection assets={assets} />
        </Suspense>
      </div>
    </div>
  );
}
