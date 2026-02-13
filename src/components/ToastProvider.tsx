'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
    id: string;
    message: string;
    detail: string;
    time: string;
}

interface ToastContextType {
    showToast: (message: string, detail: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, detail: string) => {
        const now = new Date();
        const time = now.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const toast: Toast = { id, message, detail, time };

        setToasts((prev) => [...prev, toast]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            className="toast"
                            initial={{ opacity: 0, x: 80, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        >
                            <div className="toast-icon">✓</div>
                            <div className="toast-body">
                                <div className="toast-message">{toast.message}</div>
                                <div className="toast-detail">{toast.detail}</div>
                            </div>
                            <div className="toast-time">{toast.time}</div>
                            <button
                                className="toast-close"
                                onClick={() =>
                                    setToasts((prev) =>
                                        prev.filter((t) => t.id !== toast.id)
                                    )
                                }
                            >
                                ✕
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
