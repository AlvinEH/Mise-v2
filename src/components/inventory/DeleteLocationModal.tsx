import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteLocationModalProps {
  locationName: string | null;
  onClose: () => void;
  onConfirm: (location: string) => void;
}

export const DeleteLocationModal: React.FC<DeleteLocationModalProps> = ({
  locationName,
  onClose,
  onConfirm
}) => {
  return (
    <AnimatePresence>
      {locationName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-m3-surface w-full max-w-sm rounded-[28px] p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-m3-on-surface mb-2">Delete Location?</h3>
            <p className="text-m3-on-surface-variant mb-6">
              Are you sure you want to delete <span className="font-bold">"{locationName}"</span>? 
              This will also delete all items stored in this location. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-m3-primary font-bold hover:bg-m3-primary/8 rounded-full transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(locationName)}
                className="px-6 py-2.5 bg-m3-error text-m3-on-error font-bold hover:bg-m3-error/90 rounded-full shadow-sm hover:shadow-md transition-all"
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
