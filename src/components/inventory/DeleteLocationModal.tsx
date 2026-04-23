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
          key="delete-location-wrapper"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        >
          <motion.div
            key="delete-location-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="delete-location-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-m3-surface w-full max-w-sm rounded-[28px] p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-m3-on-surface mb-2">Delete Location?</h3>
            <p className="text-m3-on-surface-variant mb-6">
              Are you sure you want to delete <span className="font-bold">"{locationName}"</span>? 
              This will also delete all items stored in this location. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(locationName)}
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
