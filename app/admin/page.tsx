import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { AdminMaterialsDashboard } from '@/components/admin/admin-materials-dashboard';
import { getAllAssets } from '@/lib/data';
import { getAllMaterials } from '@/lib/materials-data';
import { getStorageMode } from '@/lib/storage';
import { getCdnBase } from '@/lib/utils';
import { AdminTabs } from '@/components/admin/admin-tabs';

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
    <div className="min-h-screen w-full bg-[#04050f] pb-16 pt-8 text-slate-100">
      <div className="admin-surface mx-auto w-full max-w-7xl px-4 sm:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">后台管理</h1>
          <p className="text-sm text-slate-400">
            系统已统一使用 OSS 存储，确保资产与素材数据在本地与线上保持一致。
          </p>
        </div>

        <AdminTabs>
          <AdminDashboard initialAssets={assets} storageMode={storageMode} cdnBase={cdnBase} />
          <AdminMaterialsDashboard initialMaterials={materials} storageMode={storageMode} cdnBase={cdnBase} />
        </AdminTabs>
      </div>
    </div>
  );
}


