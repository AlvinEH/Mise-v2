import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, MoveHorizontal } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'move';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none w-full max-w-xs px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="pointer-events-auto bg-m3-surface-container-high border border-m3-outline/10 shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[280px] max-w-[90vw]"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-m3-primary/10 flex items-center justify-center text-m3-primary">
        {toast.type === 'move' ? <MoveHorizontal size={20} /> : <Check size={20} />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-m3-on-surface leading-tight">
          {toast.message}
        </p>
      </div>
    </motion.div>
  );
};
