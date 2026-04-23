import React, { memo, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { ChevronDown, ChevronUp, Maximize2, Plus, Edit2, X, ShoppingCart } from 'lucide-react';
import { InventoryItem, CheckboxStyle } from '../../types';
import { InventoryListItem } from './InventoryListItem';

interface LocationCardProps {
  location: string;
  index: number;
  locationItems: InventoryItem[];
  toggleCardCollapsed: (loc: string) => void;
  expandedCards: Record<string, boolean>;
  handleExpand: (loc: string) => void;
  toggleItemUsed: (item: InventoryItem) => void;
  startEdit: (item: InventoryItem) => void;
  handleDelete: (item: InventoryItem) => void;
  checkboxStyle: CheckboxStyle;
  handleClearUsed: (loc: string) => void;
  handleRestockUsed: (loc: string) => void;
  handleClearAndRestockUsed: (loc: string) => void;
  startAddWithLocation: (loc: string) => void;
  isDraggingLocRef: React.MutableRefObject<boolean>;
  onReorderItems: (location: string, newItems: InventoryItem[]) => void;
  onReorderEnd: (location: string) => void;
  onMoveItems: (location: string) => void;
  onListRef: (location: string, el: HTMLDivElement | null) => void;
}

export const LocationCard = memo(({ 
  location, 
  index, 
  locationItems, 
  toggleCardCollapsed, 
  expandedCards, 
  handleExpand, 
  toggleItemUsed, 
  startEdit, 
  handleDelete, 
  checkboxStyle,
  handleClearUsed,
  handleRestockUsed,
  handleClearAndRestockUsed,
  startAddWithLocation,
  isDraggingLocRef,
  onReorderItems,
  onReorderEnd,
  onMoveItems,
  onListRef
}: LocationCardProps) => {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="bg-m3-surface border border-m3-outline/10 rounded-[24px] overflow-hidden shadow-sm flex flex-col h-fit relative group"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4 bg-m3-surface-container-low">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 hover:bg-m3-surface-variant/10 -m-2 p-2 rounded-xl transition-colors"
          onClick={() => toggleCardCollapsed(location)}
        >
          <div>
            <h3 className="text-xl font-black text-m3-on-surface leading-tight">{location}</h3>
            <span className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider mt-[-2px] block">
              {locationItems.length} items
            </span>
          </div>
          <div className="ml-auto text-m3-on-surface-variant/40">
            {expandedCards[location] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
        <div className="flex items-center ml-2 gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditMode(!isEditMode);
              if (!expandedCards[location]) toggleCardCollapsed(location);
            }}
            className={`p-2 rounded-full transition-all ${isEditMode ? 'text-m3-primary bg-m3-primary/10 shadow-sm' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
            title={isEditMode ? "Done" : "Quick Edit"}
          >
            {isEditMode ? <X size={18} /> : <Edit2 size={18} />}
          </button>
          <button
            onClick={() => {
              handleExpand(location);
            }}
            className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
            title="Full Screen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
      
      {/* Expandable Content Section */}
      <AnimatePresence initial={false}>
        {expandedCards[location] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col max-h-[400px] lg:max-h-[600px]"
          >
            <div 
              ref={(el) => onListRef(location, el)}
              className="flex-1 overflow-y-auto space-y-0.5 px-4 pb-2"
            >
              {locationItems.length > 0 ? (
                <Reorder.Group 
                  axis="y"
                  values={locationItems}
                  onReorder={(newItems) => onReorderItems(location, newItems)}
                  className="space-y-0.5"
                >
                  <AnimatePresence>
                    {locationItems.map((item) => (
                      <InventoryListItem
                        key={item.id}
                        item={item}
                        onToggleUsed={toggleItemUsed}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        isExpandedView={false}
                        isEditMode={isEditMode}
                        checkboxStyle={checkboxStyle}
                        className="py-1 px-0 hover:bg-m3-surface-variant/10 rounded-xl"
                        isDraggingLocRef={isDraggingLocRef}
                        onReorderEnd={() => onReorderEnd(location)}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-m3-on-surface-variant/60 text-base font-medium">
                    No items in {location.toLowerCase()}
                  </p>
                </div>
                )}
            </div>
            
            {/* Footer Section - Part of collapsible content */}
            <div className="bg-m3-surface-container-low px-4 py-4 border-t border-m3-outline/5 flex flex-col shrink-0">
              <AnimatePresence>
                {(() => {
                  const usedItems = locationItems.filter(i => i.used);
                  const hasUsed = usedItems.length > 0;

                  if (!hasUsed) return null;

                  return (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, height: 0, marginBottom: 0 },
                        visible: { 
                          opacity: 1, 
                          height: 'auto', 
                          marginBottom: 16,
                          transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                        },
                        exit: { 
                          opacity: 0, 
                          height: 0, 
                          marginBottom: 0,
                          transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }
                        }
                      }}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex flex-col overflow-hidden"
                    >
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 5 },
                          visible: { 
                            opacity: 1, 
                            y: 0,
                            transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }
                          },
                          exit: { 
                            opacity: 0, 
                            y: 5,
                            transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                          }
                        }}
                        className="flex flex-col gap-3 px-1"
                      >
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-m3-on-surface-variant/50 uppercase tracking-widest">
                            Batch Actions
                          </span>
                          <div className="flex gap-2">
                             <span className="text-[10px] font-bold text-m3-on-surface-variant/40">
                               {usedItems.length} SELECTED
                             </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => onMoveItems(location)}
                            className="flex-1 py-2 bg-m3-surface text-m3-tertiary rounded-xl hover:bg-m3-tertiary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10"
                            title="Move selected items to another location"
                          >
                            Move
                          </button>
                          <button
                            onClick={() => handleClearUsed(location)}
                            className="flex-1 py-2 bg-m3-surface text-m3-on-surface-variant rounded-xl hover:bg-m3-error hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10"
                            title="Clear used items"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleRestockUsed(location)}
                            className="flex-1 py-2 bg-m3-surface text-m3-primary rounded-xl hover:bg-m3-primary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10"
                            title="Add to shopping list"
                          >
                            Restock
                          </button>
                        </div>

                        <button
                          onClick={() => handleClearAndRestockUsed(location)}
                          className="w-full py-2.5 bg-m3-surface text-m3-secondary rounded-xl hover:bg-m3-secondary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10"
                          title="Restock then clear selected items"
                        >
                          Clear and Restock
                        </button>
                      </motion.div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <button
                onClick={() => startAddWithLocation(location)}
                className="w-full p-2 bg-m3-primary/10 text-m3-primary rounded-xl hover:bg-m3-primary/20 transition-all flex items-center justify-center gap-2 text-base font-medium"
              >
                <Plus size={18} />
                Add to {location}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
