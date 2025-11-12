'use client';

import { AdminDashboard } from './admin-dashboard';
import type { Asset } from '@/data/manifest.schema';
import { useAdminRefresh } from './admin-refresh-context';

type StorageMode = 'local' | 'oss';

interface AssetsManageProps {
  initialAssets: Asset[];
  storageMode: StorageMode;
  cdnBase: string;
}

export function AssetsManage({ initialAssets, storageMode, cdnBase }: AssetsManageProps) {
  const { assetsRefreshKey } = useAdminRefresh();
  
  // 只显示列表部分，不显示新增表单
  return (
    <AdminDashboard 
      initialAssets={initialAssets} 
      storageMode={storageMode} 
      cdnBase={cdnBase}
      showOnlyList={true}
      refreshKey={assetsRefreshKey}
    />
  );
}

