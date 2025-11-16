'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchHeaderActions } from './search-header-actions';

export function SearchHeaderActionsPortal() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.getElementById('header-actions-portal');
    setPortalTarget(target);
  }, []);

  if (!portalTarget) return null;

  return createPortal(<SearchHeaderActions />, portalTarget);
}

