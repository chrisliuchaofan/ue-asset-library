'use client';

import { AdminMaterialsDashboard } from './admin-materials-dashboard';
import type { Material } from '@/data/material.schema';

type StorageMode = 'local' | 'oss';

interface MaterialsNewProps {
  initialMaterials: Material[];
  storageMode: StorageMode;
  cdnBase: string;
}

export function MaterialsNew({ initialMaterials, storageMode, cdnBase }: MaterialsNewProps) {
  // 暂时使用 AdminMaterialsDashboard，但只显示新增表单部分
  // TODO: 后续可以拆分出独立的 MaterialsNew 组件
  return (
    <AdminMaterialsDashboard 
      initialMaterials={initialMaterials} 
      storageMode={storageMode} 
      cdnBase={cdnBase}
      showOnlyForm={true}
    />
  );
}




