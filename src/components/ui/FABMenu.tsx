import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, ExternalLink } from 'lucide-react';

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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[-1]"
            />
            
            <motion.div 
              className="flex flex-col items-end gap-4 mb-4"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.05
                  }
                },
                hidden: {
                  transition: {
                    staggerChildren: 0.05,
                    staggerDirection: -1
                  }
                }
              }}
            >
              {/* URL Add Button */}
              <motion.div 
                className="flex items-center gap-3"
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.8 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <span className="bg-m3-surface-container-high text-m3-on-surface px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-m3-outline/10">
                  From URL
                </span>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('/add-recipe?mode=url');
                  }}
                  className="w-12 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-2xl shadow-md hover:shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200"
                  title="From URL"
                >
                  <ExternalLink size={20} strokeWidth={2.5} />
                </button>
              </motion.div>

              {/* Manual Add Button */}
              <motion.div 
                className="flex items-center gap-3"
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.8 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <span className="bg-m3-surface-container-high text-m3-on-surface px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-m3-outline/10">
                  Manual Add
                </span>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('/add-recipe?mode=manual');
                  }}
                  className="w-12 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-2xl shadow-md hover:shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200"
                  title="Manual Add"
                >
                  <Edit2 size={20} strokeWidth={2.5} />
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 bg-m3-primary-container text-m3-on-primary-container rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        title="Add New Recipe"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </motion.div>
      </button>
    </div>
  );
});
