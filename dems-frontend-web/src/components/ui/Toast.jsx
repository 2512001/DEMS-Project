import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

const TONE = {
  success: { icon: CheckCircle2, accent: 'text-success', ring: 'border-[#c7e9dd]', bg: 'bg-success-soft' },
  error: { icon: XCircle, accent: 'text-danger', ring: 'border-[#f4caca]', bg: 'bg-danger-soft' },
  warn: { icon: AlertTriangle, accent: 'text-warn', ring: 'border-[#f0dfbd]', bg: 'bg-warn-soft' },
  info: { icon: Info, accent: 'text-brand', ring: 'border-[#d5e2fb]', bg: 'bg-brand-soft' }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, options = {}) => {
    const id = ++idCounter;
    const tone = options.tone || 'info';
    setToasts((current) => [...current, { id, message, tone, title: options.title }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, options.duration ?? 4200);
    return id;
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const config = TONE[toast.tone] || TONE.info;
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-card border bg-card p-3.5 shadow-pop ${config.ring}`}
            >
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${config.bg}`}>
                <Icon size={14} className={config.accent} />
              </span>
              <div className="min-w-0 flex-1">
                {toast.title ? <p className="text-[13px] font-semibold text-ink">{toast.title}</p> : null}
                <p className="text-[13px] leading-5 text-ink-muted">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint transition hover:bg-surface hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { push: () => {}, dismiss: () => {} };
  }
  return context;
}
