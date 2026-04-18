import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveHorizontal, ChevronDown } from 'lucide-react';

interface MoveItemsModalProps {
  sourceLocation: string | null;
  onClose: () => void;
  availableLocations: string[];
  onMove: (source: string, target: string) => void;
}

export const MoveItemsModal: React.FC<MoveItemsModalProps> = ({
  sourceLocation,
  onClose,
  availableLocations,
  onMove
}) => {
  return (
    <AnimatePresence>
      {sourceLocation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-m3-surface w-full max-w-sm rounded-[28px] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-m3-primary/10 rounded-full flex items-center justify-center text-m3-primary">
                  <MoveHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-m3-on-surface leading-tight">Move Items</h3>
                  <p className="text-xs text-m3-on-surface-variant/60">From {sourceLocation}</p>
                </div>
              </div>
              
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {availableLocations.filter(loc => loc !== sourceLocation).map(loc => (
                  <button
                    key={loc}
                    onClick={() => onMove(sourceLocation, loc)}
                    className="w-full text-left px-4 py-3 hover:bg-m3-primary/5 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <span className="font-bold text-sm text-m3-on-surface group-hover:text-m3-primary transition-colors">{loc}</span>
                    <ChevronDown size={16} className="text-m3-on-surface-variant/20 -rotate-90" />
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 text-m3-on-surface-variant font-bold text-sm hover:bg-m3-surface-variant/10 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
