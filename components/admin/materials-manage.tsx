'use client';

import { AdminMaterialsDashboard } from './admin-materials-dashboard';
import type { Material } from '@/data/material.schema';
import { useAdminRefresh } from './admin-refresh-context';

type StorageMode = 'local' | 'oss';

interface MaterialsManageProps {
  initialMaterials: Material[];
  storageMode: StorageMode;
  cdnBase: string;
}

export function MaterialsManage({ initialMaterials, storageMode, cdnBase }: MaterialsManageProps) {
  const { materialsRefreshKey } = useAdminRefresh();
  
  // 暂时使用 AdminMaterialsDashboard，但只显示列表部分
  // TODO: 后续可以拆分出独立的 MaterialsManage 组件
  return (
    <AdminMaterialsDashboard 
      initialMaterials={initialMaterials} 
      storageMode={storageMode} 
      cdnBase={cdnBase}
      showOnlyList={true}
      refreshKey={materialsRefreshKey}
    />
  );
}

