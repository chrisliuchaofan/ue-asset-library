'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarToggle({ children }: { children: (context: SidebarContextType) => ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => {
    setIsOpen((prev) => !prev);
  };

  return <SidebarContext.Provider value={{ isOpen, toggle }}>{children({ isOpen, toggle })}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarToggle');
  }
  return context;
}

