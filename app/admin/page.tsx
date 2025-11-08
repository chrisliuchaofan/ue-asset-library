import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { getAllAssets } from '@/lib/data';
import { getStorageMode } from '@/lib/storage';
import { getCdnBase } from '@/lib/utils';

export const metadata: Metadata = {
  title: '后台管理 - UE 资产库',
  description: '管理 UE 资产数据与存储配置',
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const assets = await getAllAssets();
  const storageMode = getStorageMode();
  const cdnBase = getCdnBase();

  return (
    <div className="container py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">后台管理</h1>
        <p className="text-muted-foreground">
          在本地模式下可以直接操作 manifest.json；部署到 NAS 或云环境后，可根据 STORAGE_MODE 切换到远程存储。
        </p>
      </div>

      <AdminDashboard initialAssets={assets} storageMode={storageMode} cdnBase={cdnBase} />
    </div>
  );
}


