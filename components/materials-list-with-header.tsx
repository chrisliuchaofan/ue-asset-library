'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MaterialsList } from '@/components/materials-list';
import { HeaderActions } from '@/components/header-actions';
import { type Material } from '@/data/material.schema';
import { useOfficeLocation } from '@/components/office-selector';

interface MaterialsListWithHeaderProps {
  materials: Material[];
}

export function MaterialsListWithHeader({ materials }: MaterialsListWithHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [officeLocation, setOfficeLocation] = useOfficeLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const portal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">
          找到 {materials.length} 个素材
        </div>
      </div>
      <MaterialsList materials={materials} />
      {portal && createPortal(
        <HeaderActions
          officeLocation={officeLocation}
          onOfficeChange={setOfficeLocation}
        />,
        portal
      )}
    </>
  );
}

