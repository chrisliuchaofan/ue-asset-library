'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ToastComponent, type Toast } from '@/components/ui/toast';

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const success = React.useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'success', title, description, duration });
    },
    [addToast]
  );

  const error = React.useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'error', title, description, duration: duration ?? 7000 }); // 错误消息显示更久
    },
    [addToast]
  );

  const warning = React.useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'warning', title, description, duration });
    },
    [addToast]
  );

  const info = React.useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'info', title, description, duration });
    },
    [addToast]
  );

  const value = React.useMemo(
    () => ({
      toast: addToast,
      success,
      error,
      warning,
      info,
    }),
    [addToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastComponent toast={toast} onRemove={removeToast} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

