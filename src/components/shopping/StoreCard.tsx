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
  onEditItem: (item: ShoppingItem) => void;
  onDeleteStore: () => void;
  onClearCompleted: () => void;
  onReorder: (newItems: ShoppingItem[]) => void;
  onExpand: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = memo(({ 
  list, 
  items, 
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onDeleteStore,
  onClearCompleted,
  onReorder,
  onExpand,
  isCollapsed,
  onToggleCollapse
}) => {
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;

  return (
    <div className="bg-m3-surface-variant/10 rounded-xl border border-m3-outline/10 overflow-hidden transition-all group">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer bg-m3-surface-variant/20 hover:bg-m3-surface-variant/30 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex flex-col text-left flex-1">
          <h3 className="text-xl font-black text-m3-on-surface leading-tight">{list.name}</h3>
          <p className="text-xs font-bold text-m3-on-surface-variant/60 uppercase tracking-widest mt-1">
            {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="p-2 text-m3-on-surface-variant/30 hover:text-m3-primary transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-2 text-m3-on-surface-variant/30 hover:text-m3-primary transition-colors"
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
            className="p-2 text-m3-on-surface-variant/30 hover:text-m3-error transition-colors"
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
            className="bg-transparent"
          >
            <div className="max-h-[400px] overflow-y-auto">
              <ShoppingListContent 
                items={items}
                onAddItem={onAddItem}
                onToggleItem={onToggleItem}
                onDeleteItem={onDeleteItem}
                onEditItem={onEditItem}
                onClearCompleted={onClearCompleted}
                onReorder={onReorder}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
