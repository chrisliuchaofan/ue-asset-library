import type { Metadata } from 'next';
import { AssetsNew } from '@/components/admin/assets-new';
import { AssetsManage } from '@/components/admin/assets-manage';
import { MaterialsNew } from '@/components/admin/materials-new';
import { MaterialsManage } from '@/components/admin/materials-manage';
import { getAllAssets } from '@/lib/data';
import { getAllMaterials } from '@/lib/materials-data';
import { getStorageMode } from '@/lib/storage';
import { getCdnBase } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/admin-layout';

export const metadata: Metadata = {
  title: '后台管理 - UE 资产库',
  description: '管理 UE 资产数据与存储配置',
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const assets = await getAllAssets();
  const materials = await getAllMaterials();
  const storageMode = getStorageMode();
  const cdnBase = getCdnBase();

  return (
    <AdminLayout storageMode={storageMode} cdnBase={cdnBase}>
      <AssetsNew initialAssets={assets} storageMode={storageMode} cdnBase={cdnBase} />
      <AssetsManage initialAssets={assets} storageMode={storageMode} cdnBase={cdnBase} />
      <MaterialsNew initialMaterials={materials} storageMode={storageMode} cdnBase={cdnBase} />
      <MaterialsManage initialMaterials={materials} storageMode={storageMode} cdnBase={cdnBase} />
    </AdminLayout>
  );
}


