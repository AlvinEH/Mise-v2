import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreList } from '../../types';

interface DeleteStoreModalProps {
  storeToDelete: StoreList | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteStoreModal: React.FC<DeleteStoreModalProps> = ({
  storeToDelete,
  onClose,
  onConfirm
}) => {
  return (
    <AnimatePresence>
      {storeToDelete && (
        <motion.div
          key="delete-store-wrapper"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            key="delete-store-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="delete-store-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-m3-surface-container-high rounded-[28px] p-8 w-full max-w-md shadow-2xl border border-m3-outline/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-medium text-m3-on-surface mb-4">
              Delete {storeToDelete.name}?
            </h3>
            <p className="text-m3-on-surface-variant mb-8">
              This will permanently delete this store and all its items. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(storeToDelete.id)}
                className="px-8 py-2.5 bg-m3-error text-m3-on-error rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
