import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';

interface SortLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocations: string[];
  handleMoveLocationOrder: (index: number, direction: 'up' | 'down') => void;
}

export const SortLocationsModal: React.FC<SortLocationsModalProps> = ({
  isOpen,
  onClose,
  currentLocations,
  handleMoveLocationOrder
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sort-locations-wrapper"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <motion.div
            key="sort-locations-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="sort-locations-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-m3-surface rounded-[32px] p-6 w-full max-w-md shadow-xl border border-m3-outline/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-m3-on-surface">Reorder Locations</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-m3-surface-variant/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
              {currentLocations.map((locName, index, arr) => (
                <div 
                  key={locName}
                  className="flex items-center justify-between py-2 px-4 bg-m3-surface-variant/10 rounded-2xl"
                >
                  <span className="font-bold text-m3-on-surface">{locName}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveLocationOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-2 text-m3-primary hover:bg-m3-primary/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                      <ArrowUp size={20} />
                    </button>
                    <button
                      onClick={() => handleMoveLocationOrder(index, 'down')}
                      disabled={index === arr.length - 1}
                      className="p-2 text-m3-primary hover:bg-m3-primary/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                      <ArrowDown size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
