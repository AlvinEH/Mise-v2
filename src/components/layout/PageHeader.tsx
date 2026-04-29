import React, { memo } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = memo(({ title, showBack, onBack, actions }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.header 
      layoutId="global-header"
      className="flex flex-col border-b border-m3-outline/5 bg-m3-surface-container sticky top-0 z-40 pt-2 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] flex-shrink-0"
    >
      <div className="flex items-center px-4 h-16 lg:h-20 lg:px-8 relative">
        <div className="flex items-center flex-shrink-0 z-10 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-m3-surface-variant/30 text-m3-on-surface transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          <div className="relative h-8 flex items-center min-w-0">
            <AnimatePresence mode="wait">
              {title && (
                <motion.h1 
                  key={title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="text-xl lg:text-2xl font-black tracking-tight text-m3-on-surface truncate pr-4"
                >
                  {title}
                </motion.h1>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 flex-shrink-0 z-10 relative">
          {actions}
        </div>
      </div>
    </motion.header>
  );
});
