import React, { memo, useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Trash2, Edit2, X } from 'lucide-react';
import { StoreList, ShoppingItem, CheckboxStyle } from '../../types';
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
  onReorderEnd: () => void;
  onExpand: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  checkboxStyle: CheckboxStyle;
  isDraggingItemRef?: React.MutableRefObject<boolean>;
  onMoveItems: (id: string) => void;
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
  onReorderEnd,
  onExpand,
  isCollapsed,
  onToggleCollapse,
  checkboxStyle,
  isDraggingItemRef,
  onMoveItems
}) => {
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-sm flex flex-col h-fit overflow-hidden group">
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4 bg-m3-surface-container-low">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 hover:bg-m3-surface-variant/10 -m-2 p-2 rounded-xl transition-colors"
          onClick={onToggleCollapse}
        >
          <div>
            <h3 className="text-xl font-black text-m3-on-surface leading-tight">{list.name}</h3>
            <span className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider mt-[-2px] block">
              {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <div className="ml-auto text-m3-on-surface-variant/40">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </div>
        
        <div className="flex items-center ml-2 gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
              if (isCollapsed) onToggleCollapse();
            }}
            className={`p-2 rounded-full transition-all ${isEditMode ? 'text-m3-primary bg-m3-primary/10 shadow-sm' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
            title={isEditMode ? "Done" : "Quick Edit"}
          >
            {isEditMode ? <X size={18} /> : <Edit2 size={18} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
            title="Full Screen"
          >
            <Maximize2 size={18} />
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
            className="bg-transparent flex flex-col overflow-hidden max-h-[400px] lg:max-h-[600px]"
          >
            <ShoppingListContent 
              items={items}
              onAddItem={onAddItem}
              onToggleItem={onToggleItem}
              onDeleteItem={onDeleteItem}
              onEditItem={onEditItem}
              onClearCompleted={onClearCompleted}
              onReorder={onReorder}
              onReorderEnd={onReorderEnd}
              isEditMode={isEditMode}
              checkboxStyle={checkboxStyle}
              isDraggingItemRef={isDraggingItemRef}
              onMoveItems={() => onMoveItems(list.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
