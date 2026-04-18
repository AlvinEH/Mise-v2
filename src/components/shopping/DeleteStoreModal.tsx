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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-m3-surface-container-high rounded-[28px] p-8 w-full max-w-md shadow-2xl border border-m3-outline/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-medium text-m3-on-surface mb-4">
              Delete {storeToDelete.name}?
            </h3>
            <p className="text-m3-on-surface-variant mb-8">
              This will permanently delete this store and all its items. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-m3-primary font-medium hover:bg-m3-primary/8 rounded-full transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(storeToDelete.id)}
                className="px-6 py-2.5 bg-m3-error text-m3-on-error font-medium hover:bg-m3-error/90 rounded-full shadow-sm hover:shadow-md transition-all"
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
