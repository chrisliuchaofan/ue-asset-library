'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MaterialsList } from '@/components/materials-list';
import { HeaderActions } from '@/components/header-actions';
import { type Material } from '@/data/material.schema';

interface MaterialsListWithHeaderProps {
  materials: Material[];
}

export function MaterialsListWithHeader({ materials }: MaterialsListWithHeaderProps) {
  const [mounted, setMounted] = useState(false);

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
        <HeaderActions />,
        portal
      )}
    </>
  );
}

