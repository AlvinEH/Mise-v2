import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ShoppingItem } from '../../types';

interface EditItemModalProps {
  editingItem: ShoppingItem | null;
  onClose: () => void;
  editItemName: string;
  setEditItemName: (val: string) => void;
  onUpdate: (e: React.FormEvent) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  editingItem,
  onClose,
  editItemName,
  setEditItemName,
  onUpdate
}) => {
  return (
    <AnimatePresence>
      {editingItem && (
        <motion.div 
          key="edit-item-wrapper"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div 
            key="edit-item-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="edit-item-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-m3-surface-container-high rounded-[28px] shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-m3-outline-variant/20 flex items-center justify-between">
              <h2 className="text-xl font-black text-m3-on-surface">Edit Item</h2>
              <button
                onClick={onClose}
                className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary rounded-full transition-all"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={onUpdate} className="p-6 space-y-4">
              <input
                type="text"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-m3-surface-container-highest border-none text-m3-on-surface placeholder-m3-on-surface-variant/50 focus:ring-2 focus:ring-m3-primary transition-all font-bold"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-m3-primary text-m3-on-primary rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
