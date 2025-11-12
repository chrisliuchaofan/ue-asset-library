'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AdminRefreshContextValue {
  refreshAssets: () => void;
  refreshMaterials: () => void;
  assetsRefreshKey: number;
  materialsRefreshKey: number;
}

const AdminRefreshContext = createContext<AdminRefreshContextValue | undefined>(undefined);

export function AdminRefreshProvider({ children }: { children: ReactNode }) {
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);
  const [materialsRefreshKey, setMaterialsRefreshKey] = useState(0);

  const refreshAssets = useCallback(() => {
    setAssetsRefreshKey((prev) => prev + 1);
  }, []);

  const refreshMaterials = useCallback(() => {
    setMaterialsRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <AdminRefreshContext.Provider
      value={{
        refreshAssets,
        refreshMaterials,
        assetsRefreshKey,
        materialsRefreshKey,
      }}
    >
      {children}
    </AdminRefreshContext.Provider>
  );
}

export function useAdminRefresh() {
  const context = useContext(AdminRefreshContext);
  if (context === undefined) {
    throw new Error('useAdminRefresh must be used within AdminRefreshProvider');
  }
  return context;
}

