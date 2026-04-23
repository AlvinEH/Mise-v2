import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { X, Edit2, Minimize2, Trash2, Plus, ShoppingCart } from 'lucide-react';
import { InventoryItem, CheckboxStyle } from '../../types';
import { InventoryListItem } from './InventoryListItem';

interface LocationExpandedViewProps {
  location: string | null;
  onClose: () => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  isEditingLocationName: boolean;
  setIsEditingLocationName: (val: boolean) => void;
  editLocationNameValue: string;
  setEditLocationNameValue: (val: string) => void;
  handleUpdateLocationName: () => void;
  handleStartEditLocationName: (loc: string) => void;
  setLocationToDelete: (loc: string) => void;
  setLocationToMove: (loc: string) => void;
  filteredItems: InventoryItem[];
  toggleItemUsed: (item: InventoryItem) => void;
  startEdit: (item: InventoryItem) => void;
  handleDelete: (item: InventoryItem) => void;
  handleClearUsed: (loc: string) => void;
  handleRestockUsed: (loc: string) => void;
  handleClearAndRestockUsed: (loc: string) => void;
  handleReorderItems: (loc: string, items: InventoryItem[]) => void;
  syncReorderedItems: (loc: string) => void;
  startAddWithLocation: (loc: string) => void;
  checkboxStyle: CheckboxStyle;
}

export const LocationExpandedView: React.FC<LocationExpandedViewProps> = ({
  location,
  onClose,
  isEditMode,
  setIsEditMode,
  isEditingLocationName,
  setIsEditingLocationName,
  editLocationNameValue,
  setEditLocationNameValue,
  handleUpdateLocationName,
  handleStartEditLocationName,
  setLocationToDelete,
  setLocationToMove,
  filteredItems,
  toggleItemUsed,
  startEdit,
  handleDelete,
  handleClearUsed,
  handleRestockUsed,
  handleClearAndRestockUsed,
  handleReorderItems,
  syncReorderedItems,
  startAddWithLocation,
  checkboxStyle
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const expandedItems = filteredItems.filter(item => item.location === location);
  const usedCount = expandedItems.filter(i => i.used).length;

  return (
    <AnimatePresence>
      {location && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
        >
          {/* Header */}
          <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface shrink-0">
            <div className="flex items-center flex-1 min-w-0">
              {isEditingLocationName ? (
                <input
                  autoFocus
                  type="text"
                  value={editLocationNameValue}
                  onChange={(e) => setEditLocationNameValue(e.target.value)}
                  onBlur={handleUpdateLocationName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateLocationName();
                    if (e.key === 'Escape') setIsEditingLocationName(false);
                  }}
                  className="text-2xl font-black text-m3-on-surface bg-m3-surface-variant/20 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-m3-primary w-full max-md:max-w-md"
                />
              ) : (
                <h2 
                  onClick={() => handleStartEditLocationName(location)}
                  className="text-2xl font-black text-m3-on-surface truncate cursor-pointer hover:text-m3-primary transition-colors"
                  title="Click to rename"
                >
                  {location}
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
                onClick={() => setLocationToDelete(location)}
                className="flex-1 flex items-center justify-center w-10 h-10 text-m3-error font-bold hover:bg-m3-error/10 rounded-xl transition-all"
                title="Delete Location"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto overflow-hidden">
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto min-h-0 px-4 lg:px-6 pt-4 lg:pt-8"
              style={{ overflowAnchor: 'none' }}
            >
              {expandedItems.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={expandedItems}
                  onReorder={(newItems) => handleReorderItems(location, newItems)}
                  className="flex flex-col gap-2 pb-2"
                >
                  <AnimatePresence>
                    {expandedItems.map((item) => (
                      <InventoryListItem
                        key={item.id}
                        item={item}
                        onToggleUsed={toggleItemUsed}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        isExpandedView={true}
                        isEditMode={isEditMode}
                        checkboxStyle={checkboxStyle}
                        className="py-1 px-0 hover:bg-m3-surface-variant/10 rounded-xl transition-colors"
                        onReorderEnd={() => syncReorderedItems(location)}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                  <p className="text-m3-on-surface-variant/60 text-sm font-medium">
                    No items in {location.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer Area group */}
            <div 
              className="bg-m3-surface-container-low border-t border-m3-outline/5 shrink-0 flex flex-col overflow-hidden"
            >
              {/* Batch Actions */}
              <AnimatePresence initial={false}>
                {usedCount > 0 && (
                  <motion.div 
                    key="batch-actions-footer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="flex flex-col overflow-hidden"
                  >
                    <div className="px-6 pt-4 pb-2 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">Batch Actions</h3>
                        <span className="text-[10px] font-bold text-m3-on-surface-variant/40 uppercase">
                          {usedCount} SELECTED
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLocationToMove(location)}
                          className="flex-1 py-2 bg-m3-surface text-m3-tertiary rounded-xl hover:bg-m3-tertiary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10 text-center"
                        >
                          Move
                        </button>
                        <button
                          onClick={() => handleClearUsed(location)}
                          className="flex-1 py-2 bg-m3-surface text-m3-on-surface-variant rounded-xl hover:bg-m3-error hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10 text-center"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => handleRestockUsed(location)}
                          className="flex-1 py-2 bg-m3-surface text-m3-primary rounded-xl hover:bg-m3-primary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10 text-center"
                        >
                          Restock
                        </button>
                      </div>

                      <button
                        onClick={() => handleClearAndRestockUsed(location)}
                        className="w-full py-2.5 bg-m3-surface text-m3-secondary rounded-xl hover:bg-m3-secondary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10"
                      >
                        Clear and Restock
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add Button */}
              <div className="px-6 py-4">
                <button
                  onClick={() => {
                    startAddWithLocation(location);
                  }}
                  className="w-full px-4 py-3.5 bg-m3-primary text-m3-on-primary rounded-2xl font-bold hover:bg-m3-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={18} />
                  Add to {location}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
