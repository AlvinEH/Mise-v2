import React, { memo, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { ChevronDown, ChevronUp, Maximize2, Plus, Edit2, X } from 'lucide-react';
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
  startAddWithLocation: (loc: string) => void;
  isDraggingLocRef: React.MutableRefObject<boolean>;
  onReorderItems: (location: string, newItems: InventoryItem[]) => void;
  onReorderEnd: (location: string) => void;
  onMoveItems: (location: string) => void;
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
  startAddWithLocation,
  isDraggingLocRef,
  onReorderItems,
  onReorderEnd,
  onMoveItems
}: LocationCardProps) => {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout="position"
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
            className="flex flex-col overflow-hidden"
            style={{ 
              maxHeight: locationItems.length === 0 ? '280px' : Math.min(10, locationItems.length) * 45 + 120 + 'px'
            }}
          >
            <div className={`space-y-0.5 px-6 pb-2 ${locationItems.length > 10 ? 'overflow-y-auto' : ''}`}>
              <AnimatePresence>
                {locationItems.some(i => i.used) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center px-2 overflow-hidden mb-1"
                  >
                    <button
                      onClick={() => onMoveItems(location)}
                      className="text-[10px] font-black text-m3-primary hover:underline transition-all uppercase tracking-wider py-1"
                    >
                      Move to Location
                    </button>
                    <button
                      onClick={() => handleClearUsed(location)}
                      className="text-[10px] font-black text-m3-error hover:underline transition-all uppercase tracking-wider py-1"
                    >
                      Clear Used
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                        className="py-1 px-2 hover:bg-m3-surface-variant/10 rounded-xl"
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
            <div className="sticky bottom-0 bg-m3-surface-container-low px-6 py-4 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)]">
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
