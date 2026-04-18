import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-m3-surface-container-high rounded-[28px] shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-m3-outline-variant/20">
              <h2 className="text-xl font-black text-m3-on-surface">Edit Item</h2>
            </div>
            <form onSubmit={onUpdate} className="p-6 space-y-4">
              <input
                type="text"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-m3-surface-container-highest border-none text-m3-on-surface placeholder-m3-on-surface-variant/50 focus:ring-2 focus:ring-m3-primary transition-all font-bold"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-m3-outline text-m3-primary font-bold hover:bg-m3-primary/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-m3-primary text-m3-on-primary font-bold hover:shadow-lg transition-all active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
