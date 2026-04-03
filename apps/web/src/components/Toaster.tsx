import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from '@phosphor-icons/react';

interface ToastEvent {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEvent>;
      setToasts((prev) => [...prev, customEvent.detail]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== customEvent.detail.id));
      }, 4000);
    };

    window.addEventListener('efi-toast', handleToast);
    return () => window.removeEventListener('efi-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-4 py-3 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.2)] animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto"
        >
          {t.type === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
          {t.type === 'error' && <XCircle size={18} className="text-rose-500" />}
          {t.type === 'info' && <Info size={18} className="text-blue-500" />}
          <p className="text-sm font-medium text-[var(--text-primary)]">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="ml-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Cerrar notificación"
          >
            <X size={16} weight="regular" />
          </button>
        </div>
      ))}
    </div>
  );
}