import React, { memo, useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Trash2 } from 'lucide-react';
import { StoreList, ShoppingItem } from '../../types';
import { ShoppingListContent } from './ShoppingListContent';
import { motion, AnimatePresence } from 'motion/react';

interface StoreCardProps {
  list: StoreList;
  items: ShoppingItem[];
  onAddItem: (name: string) => void;
  onToggleItem: (item: ShoppingItem) => void;
  onDeleteItem: (id: string) => void;
  onDeleteStore: () => void;
  onClearCompleted: () => void;
  onReorder: (newItems: ShoppingItem[]) => void;
  onExpand: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = memo(({ 
  list, 
  items, 
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onDeleteStore,
  onClearCompleted,
  onReorder,
  onExpand 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;

  return (
    <div className="bg-m3-surface-variant/30 rounded-[32px] border border-m3-outline/10 overflow-hidden hover:bg-m3-surface-variant/50 transition-all group">
      <div 
        className="p-6 flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4 text-left flex-1">
          <div className="w-12 h-12 bg-m3-primary-container text-m3-on-primary-container rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
            {isCollapsed ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-m3-on-surface leading-tight">{list.name}</h3>
            <p className="text-sm font-bold text-m3-on-surface-variant/60 uppercase tracking-widest">
              {completedCount}/{totalCount} Items Completed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-3 text-m3-on-surface-variant/30 hover:text-m3-primary transition-colors"
            title="Full Screen"
          >
            <Maximize2 size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete ${list.name} and all its items?`)) {
                onDeleteStore();
              }
            }}
            className="p-3 text-m3-on-surface-variant/30 hover:text-m3-error transition-colors"
            title="Delete Store"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-m3-outline/5 bg-m3-surface/20"
          >
            <div className="max-h-[400px] overflow-y-auto">
              <ShoppingListContent 
                items={items}
                onAddItem={onAddItem}
                onToggleItem={onToggleItem}
                onDeleteItem={onDeleteItem}
                onClearCompleted={onClearCompleted}
                onReorder={onReorder}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Progress Bar */}
      <div className="h-1.5 bg-m3-outline/5 w-full">
        <div 
          className="h-full bg-m3-primary transition-all duration-500"
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
});
