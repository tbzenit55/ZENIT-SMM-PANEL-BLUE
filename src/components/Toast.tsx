import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type, title, message, duration = 4000 }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    toast({ type: 'success', title, message });
  }, [toast]);

  const error = useCallback((title: string, message?: string) => {
    toast({ type: 'error', title, message });
  }, [toast]);

  const warning = useCallback((title: string, message?: string) => {
    toast({ type: 'warning', title, message });
  }, [toast]);

  const info = useCallback((title: string, message?: string) => {
    toast({ type: 'info', title, message });
  }, [toast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const borderColors = {
    success: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    error: 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]',
    warning: 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]',
    info: 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]',
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex gap-3 p-4 bg-[#0A0E17]/95 backdrop-blur-md border ${borderColors[t.type]} rounded-xl text-white`}
            >
              <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-100">{t.title}</h4>
                {t.message && (
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                id={`close-toast-${t.id}`}
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
export default ToastProvider;
