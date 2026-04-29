import React from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderSearchBarProps {
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  placeholder: string;
  isSearching?: boolean;
  maxWidth?: string;
}

export const HeaderSearchBar = ({
  isExpanded,
  onExpandChange,
  searchQuery,
  onSearchQueryChange,
  placeholder,
  isSearching = false,
  maxWidth = 'clamp(200px, 75vw, 600px)',
}: HeaderSearchBarProps) => {
  return (
    <div className="flex items-center relative justify-end">
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: maxWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300, 
              mass: 0.8
            }}
            className="absolute right-full mr-2 flex items-center bg-m3-surface-variant/20 rounded-full h-11 px-4 overflow-hidden shrink-0 z-20 shadow-sm"
          >
            <Search size={18} className="text-m3-on-surface-variant/50 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm font-bold text-m3-on-surface placeholder:text-m3-on-surface-variant/40"
            />
            {(searchQuery || isSearching) && (
              <button
                onClick={() => onSearchQueryChange('')}
                className="p-1 text-m3-on-surface-variant hover:text-m3-on-surface rounded-full hover:bg-m3-surface-variant/20 transition-all ml-1 flex-shrink-0"
              >
                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-m3-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X size={14} />
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          onExpandChange(!isExpanded);
          if (isExpanded) onSearchQueryChange('');
        }}
        className={`p-2 rounded-full transition-all flex-shrink-0 ${
          isExpanded 
            ? 'bg-m3-primary text-m3-on-primary shadow-md' 
            : 'text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10'
        }`}
        title="Search"
      >
        {isExpanded ? <X size={20} /> : <Search size={20} />}
      </button>
    </div>
  );
};
