import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, ExternalLink, Image } from 'lucide-react';

interface FABMenuProps {
  onNavigate: (path: string) => void;
}

export const FABMenu: React.FC<FABMenuProps> = memo(({ onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative flex flex-col items-end">
      {/* Expandable Options */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop - Simplified for performance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/10 z-[-1] will-change-opacity"
            />
            
            <motion.div 
              className="flex flex-col items-end gap-3 mb-4"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0.01
                  }
                },
                hidden: {
                  transition: {
                    staggerChildren: 0.02,
                    staggerDirection: -1
                  }
                }
              }}
            >
              {/* Image Add Button */}
              <motion.div 
                className="flex items-center gap-3 will-change-transform"
                variants={{
                  hidden: { opacity: 0, y: 8, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 600, damping: 40 }}
              >
                <span className="bg-m3-surface-container-high text-m3-on-surface px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-m3-outline/5">
                  From Image
                </span>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('/add-recipe?mode=image');
                  }}
                  className="w-12 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-[12px] shadow-sm flex items-center justify-center transition-transform active:scale-95"
                  title="From Image"
                >
                  <Image size={20} strokeWidth={2} />
                </button>
              </motion.div>

              {/* URL Add Button */}
              <motion.div 
                className="flex items-center gap-3 will-change-transform"
                variants={{
                  hidden: { opacity: 0, y: 8, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 600, damping: 40 }}
              >
                <span className="bg-m3-surface-container-high text-m3-on-surface px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-m3-outline/5">
                  From URL
                </span>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('/add-recipe?mode=url');
                  }}
                  className="w-12 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-[12px] shadow-sm flex items-center justify-center transition-transform active:scale-95"
                  title="From URL"
                >
                  <ExternalLink size={20} strokeWidth={2} />
                </button>
              </motion.div>

              {/* Manual Add Button */}
              <motion.div 
                className="flex items-center gap-3 will-change-transform"
                variants={{
                  hidden: { opacity: 0, y: 8, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 600, damping: 40 }}
              >
                <span className="bg-m3-surface-container-high text-m3-on-surface px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-m3-outline/5">
                  Manual Add
                </span>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('/add-recipe?mode=manual');
                  }}
                  className="w-12 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-[12px] shadow-sm flex items-center justify-center transition-transform active:scale-95"
                  title="Manual Add"
                >
                  <Edit2 size={20} strokeWidth={2} />
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button 
        onClick={() => setIsExpanded(!isExpanded)}
        animate={{ 
          rotate: isExpanded ? 45 : 0,
          backgroundColor: isExpanded ? "var(--m3-secondary)" : "var(--m3-primary-container)",
          color: isExpanded ? "var(--m3-on-secondary)" : "var(--m3-on-primary-container)"
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 35,
          backgroundColor: { duration: 0.2 },
          color: { duration: 0.2 }
        }}
        className="w-14 h-14 rounded-[16px] shadow-md flex items-center justify-center group relative overflow-hidden will-change-transform"
        title="Add New Recipe"
      >
        <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.08] transition-opacity" />
        <div className="relative z-10">
          <Plus size={24} strokeWidth={2} />
        </div>
      </motion.button>
    </div>
  );
});
