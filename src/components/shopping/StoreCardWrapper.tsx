import React, { memo } from 'react';
import { motion } from 'motion/react';
import { StoreCard } from './StoreCard';
import { StoreList, ShoppingItem, CheckboxStyle } from '../../types';

interface StoreCardWrapperProps {
  list: StoreList;
  shoppingItems: ShoppingItem[];
  handleAddItem: (id: string, name: string) => void;
  handleToggleItem: (item: ShoppingItem) => void;
  handleDeleteItem: (id: string) => void;
  handleEditItem: (item: ShoppingItem) => void;
  handleDeleteStore: (id: string) => void;
  handleClearCompleted: (id: string) => void;
  handleReorder: (id: string, items: ShoppingItem[]) => void;
  syncReorderedItems: (id: string) => void;
  handleExpand: (id: string) => void;
  expandedCardId: string | null;
  setExpandedCardId: (id: string | null) => void;
  checkboxStyle: CheckboxStyle;
  isDraggingItemRef: React.MutableRefObject<boolean>;
  onMoveItems: (id: string) => void;
  index: number;
}

export const StoreCardWrapper = memo(({ 
  list, 
  shoppingItems, 
  handleAddItem, 
  handleToggleItem, 
  handleDeleteItem, 
  handleEditItem, 
  handleDeleteStore, 
  handleClearCompleted, 
  handleReorder, 
  syncReorderedItems, 
  handleExpand, 
  expandedCardId, 
  setExpandedCardId, 
  checkboxStyle,
  isDraggingItemRef,
  onMoveItems,
  index
}: StoreCardWrapperProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      transition={{ 
        layout: { type: "spring", stiffness: 450, damping: 40, mass: 1 },
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4, delay: index * 0.1 }
      }}
      className="relative group"
    >
      <StoreCard 
        list={list} 
        items={shoppingItems.filter(item => item.storeListId === list.id)}
        onAddItem={(name) => handleAddItem(list.id, name)}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        onEditItem={handleEditItem}
        onDeleteStore={() => handleDeleteStore(list.id)}
        onClearCompleted={() => handleClearCompleted(list.id)}
        onReorder={(newItems) => handleReorder(list.id, newItems)}
        onReorderEnd={() => syncReorderedItems(list.id)}
        onExpand={() => {
          handleExpand(list.id);
        }}
        isCollapsed={expandedCardId !== list.id}
        onToggleCollapse={() => {
          setExpandedCardId(expandedCardId === list.id ? null : list.id);
        }}
        checkboxStyle={checkboxStyle}
        isDraggingItemRef={isDraggingItemRef}
        onMoveItems={onMoveItems}
      />
    </motion.div>
  );
});
