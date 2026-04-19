import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Minimize2, Trash2 } from 'lucide-react';
import { StoreList, ShoppingItem, CheckboxStyle } from '../../types';
import { ShoppingListContent } from './ShoppingListContent';

interface StoreExpandedViewProps {
  expandedListId: string | null;
  onClose: () => void;
  storeLists: StoreList[];
  shoppingItems: ShoppingItem[];
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  isEditingStoreName: boolean;
  setIsEditingStoreName: (val: boolean) => void;
  editStoreNameValue: string;
  setEditStoreNameValue: (val: string) => void;
  handleUpdateStoreName: () => void;
  handleStartEditStoreName: (name: string) => void;
  setStoreToDelete: (list: StoreList) => void;
  handleAddItem: (id: string, name: string) => void;
  handleToggleItem: (item: ShoppingItem) => void;
  handleDeleteItem: (id: string) => void;
  handleEditItem: (item: ShoppingItem) => void;
  handleClearCompleted: (id: string) => void;
  handleReorder: (id: string, items: ShoppingItem[]) => void;
  syncReorderedItems: (id: string) => void;
  checkboxStyle: CheckboxStyle;
  onMoveItems: (id: string) => void;
}

export const StoreExpandedView: React.FC<StoreExpandedViewProps> = ({
  expandedListId,
  onClose,
  storeLists,
  shoppingItems,
  isEditMode,
  setIsEditMode,
  isEditingStoreName,
  setIsEditingStoreName,
  editStoreNameValue,
  setEditStoreNameValue,
  handleUpdateStoreName,
  handleStartEditStoreName,
  setStoreToDelete,
  handleAddItem,
  handleToggleItem,
  handleDeleteItem,
  handleEditItem,
  handleClearCompleted,
  handleReorder,
  syncReorderedItems,
  checkboxStyle,
  onMoveItems
}) => {
  const expandedList = storeLists.find(l => l.id === expandedListId);

  return (
    <AnimatePresence>
      {expandedListId && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
        >
          <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {isEditingStoreName ? (
                <input
                  autoFocus
                  type="text"
                  value={editStoreNameValue}
                  onChange={(e) => setEditStoreNameValue(e.target.value)}
                  onBlur={handleUpdateStoreName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateStoreName();
                    if (e.key === 'Escape') setIsEditingStoreName(false);
                  }}
                  className="text-2xl font-black text-m3-on-surface bg-m3-surface-variant/20 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-m3-primary w-full max-w-md"
                />
              ) : (
                <h2 
                  onClick={() => {
                    if (expandedList) handleStartEditStoreName(expandedList.name);
                  }}
                  className="text-2xl font-black text-m3-on-surface truncate cursor-pointer hover:text-m3-primary transition-colors"
                  title="Click to rename"
                >
                  {isEditMode ? 'Editing ' : ''}{expandedList?.name}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all ${
                  isEditMode 
                    ? 'text-m3-primary hover:bg-m3-primary/10' 
                    : 'text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10'
                }`}
                title={isEditMode ? 'Done' : 'Edit'}
              >
                {isEditMode ? <X size={20} /> : <Edit2 size={20} />}
              </button>
              <button 
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 text-m3-on-surface-variant/60 font-bold hover:text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                title="Reduce"
              >
                <Minimize2 size={20} />
              </button>
              <button 
                onClick={() => {
                  if (expandedList) setStoreToDelete(expandedList);
                }}
                className="flex items-center justify-center w-10 h-10 text-m3-error font-bold hover:bg-m3-error/10 rounded-xl transition-all"
                title="Delete Store"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
            {expandedList && (
              <ShoppingListContent 
                items={shoppingItems.filter(item => item.storeListId === expandedList.id)}
                onAddItem={(name) => handleAddItem(expandedList.id, name)}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
                onClearCompleted={() => handleClearCompleted(expandedList.id)}
                onReorder={(newItems) => handleReorder(expandedList.id, newItems)}
                onReorderEnd={() => syncReorderedItems(expandedList.id)}
                isExpanded={true}
                isEditMode={isEditMode}
                checkboxStyle={checkboxStyle}
                onMoveItems={() => onMoveItems(expandedList.id)}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
