import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowDownAZ, ArrowUpAZ, Clock, History, LayoutPanelLeft } from 'lucide-react';

export type InventorySortOrder = 'custom' | 'a-z' | 'z-a' | 'newest' | 'oldest';

interface SortOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSortOrder: InventorySortOrder;
  onSortOrderChange: (order: InventorySortOrder) => void;
}

export const SortOrderModal: React.FC<SortOrderModalProps> = ({
  isOpen,
  onClose,
  currentSortOrder,
  onSortOrderChange,
}) => {
  const sortOptions: { id: InventorySortOrder; label: string; icon: React.ReactNode }[] = [
    { id: 'custom', label: 'Custom (Drag & Drop)', icon: <LayoutPanelLeft size={20} /> },
    { id: 'a-z', label: 'Alphabetical (A-Z)', icon: <ArrowDownAZ size={20} /> },
    { id: 'z-a', label: 'Alphabetical (Z-A)', icon: <ArrowUpAZ size={20} /> },
    { id: 'newest', label: 'Recently Added', icon: <Clock size={20} /> },
    { id: 'oldest', label: 'Oldest Added', icon: <History size={20} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sort-order-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-sm bg-m3-surface rounded-[32px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-m3-outline/5 bg-m3-surface-container-low">
              <h2 className="text-xl font-black text-m3-on-surface">Sort Items By</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-m3-surface-variant/20 rounded-full transition-colors text-m3-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 flex flex-col gap-1">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSortOrderChange(option.id);
                    onClose();
                  }}
                  className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all text-left font-bold ${
                    currentSortOrder === option.id
                      ? 'bg-m3-primary text-m3-on-primary shadow-md'
                      : 'text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary'
                  }`}
                >
                  <div className={currentSortOrder === option.id ? 'text-m3-on-primary' : 'text-m3-primary/60'}>
                    {option.icon}
                  </div>
                  <span className="text-base">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-m3-surface-container-low/30 flex justify-center">
               <p className="text-[10px] font-bold text-m3-on-surface-variant/40 uppercase tracking-widest text-center">
                 Changes apply to all locations
               </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
