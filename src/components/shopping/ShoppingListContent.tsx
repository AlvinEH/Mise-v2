import React, { memo, useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { ShoppingCart, Plus, CheckCircle2, Circle, Trash2, Check, Edit2, ArrowRightLeft, GripVertical } from 'lucide-react';
import { ShoppingItem, CheckboxStyle } from '../../types';
import { isItemSessionMoved } from '../../utils/session';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';

interface ShoppingListContentProps {
  items: ShoppingItem[];
  onAddItem: (name: string) => void;
  onToggleItem: (item: ShoppingItem) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: ShoppingItem) => void;
  onClearCompleted: () => void;
  onReorder: (newItems: ShoppingItem[]) => void;
  onReorderEnd: () => void;
  isExpanded?: boolean;
  isEditMode?: boolean;
  checkboxStyle: CheckboxStyle;
  isDraggingItemRef?: React.MutableRefObject<boolean>;
  onMoveItems: () => void;
}

const ShoppingListItem = memo(({ 
  item, 
  onToggleItem, 
  onDeleteItem, 
  onEditItem,
  isExpanded,
  isEditMode,
  checkboxStyle,
  onReorderEnd,
  isDraggingItemRef
}: { 
  item: ShoppingItem; 
  onToggleItem: (item: ShoppingItem) => void; 
  onDeleteItem: (id: string) => void;
  onEditItem: (item: ShoppingItem) => void;
  isExpanded: boolean;
  isEditMode?: boolean;
  checkboxStyle: CheckboxStyle;
  onReorderEnd: () => void;
  isDraggingItemRef?: React.MutableRefObject<boolean>;
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const isDraggingItem = useRef(false);
  const dragControls = useDragControls();

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingItem.current = false;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!isDraggingItem.current) {
        isLongPress.current = true;
        onEditItem(item);
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingItemRef?.current || isDraggingItem.current || isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isEditMode) {
      onEditItem(item);
    } else {
      onToggleItem(item);
    }
  };

  const isRecentlyMoved = isItemSessionMoved(item.id);

  const hasDigit = (str: string) => /\d/.test(str);
  const useDotBetweenAmountAndUnit = !!(item.amount && item.unit && hasDigit(item.amount) && hasDigit(item.unit));

  const metadata: { text: string; type: 'amount_unit' | 'category' }[] = [];
  if (useDotBetweenAmountAndUnit) {
    if (item.amount) metadata.push({ text: item.amount, type: 'amount_unit' });
    if (item.unit) metadata.push({ text: item.unit, type: 'amount_unit' });
  } else if (item.amount || item.unit) {
    metadata.push({ 
      text: `${item.amount || ''}${item.amount && item.unit ? ' ' : ''}${item.unit || ''}`.trim(),
      type: 'amount_unit'
    });
  }
  if (item.category) metadata.push({ text: item.category, type: 'category' });

  return (
    <Reorder.Item 
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.05}
      onDragStart={() => {
        isDraggingItem.current = true;
        if (isDraggingItemRef) isDraggingItemRef.current = true;
      }}
      onDragEnd={() => {
        if (isDraggingItemRef) {
          setTimeout(() => {
            isDraggingItemRef.current = false;
          }, 200);
        }
        setTimeout(() => {
          isDraggingItem.current = false;
        }, 200);
        onReorderEnd();
      }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ 
        layout: { duration: 0.2, ease: "linear" },
        opacity: { duration: 0.2 },
        height: { duration: 0.2, ease: "linear" }
      }}
      layout="position"
      className={`flex items-center justify-between py-1 hover:bg-m3-surface-variant/10 transition-colors group px-0 rounded-xl overflow-hidden select-none ${item.completed ? 'opacity-50' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {!isEditMode && (
          <button 
            onClick={handleClick}
            onPointerDownCapture={(e) => e.stopPropagation()}
            onTouchStartCapture={(e) => e.stopPropagation()}
            onMouseDownCapture={(e) => e.stopPropagation()}
            className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-all ${
              checkboxStyle === 'circle' ? 'rounded-full' : 'rounded'
            } ${
              item.completed 
                ? 'bg-m3-primary border-m3-primary text-m3-on-primary' 
                : 'border-m3-outline hover:border-m3-primary'
            }`}
          >
            {item.completed && <Check size={14} strokeWidth={3} />}
          </button>
        )}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleClick}
        >
          <div 
            className={`w-fit max-w-full ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={(e) => {
              if (isEditMode) {
                e.preventDefault();
                e.stopPropagation();
                dragControls.start(e);
              }
            }}
            style={{ touchAction: isEditMode ? 'none' : 'auto' }}
          >
            <div className="flex items-center gap-2">
              <h4 className={`font-bold text-base text-m3-on-surface leading-tight ${item.completed ? 'line-through' : ''}`}>
                {item.name}
              </h4>
              {isRecentlyMoved && (
                <span title="Recently moved">
                  <ArrowRightLeft size={12} className="text-m3-primary shrink-0" />
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center text-xs font-medium overflow-hidden">
            {metadata.map((part, idx) => (
              <React.Fragment key={idx}>
                <span className={`shrink-0 ${part.type === 'amount_unit' ? 'text-m3-primary' : 'text-m3-on-surface-variant/60'}`}>
                  {part.text}
                </span>
                {idx < metadata.length - 1 && (
                  <span className="mx-1 shrink-0 text-[10px] text-m3-on-surface-variant/40">•</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <div 
        onPointerDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        className={`flex items-center gap-1 transition-opacity ${isExpanded ? (isEditMode ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-60 group-hover:opacity-100'}`}
      >
        <button
          onClick={() => onDeleteItem(item.id)}
          className="p-2 text-m3-on-surface-variant/40 hover:text-m3-error hover:bg-m3-error/10 rounded-md transition-colors"
          title="Delete item"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </Reorder.Item>
  );
});

export const ShoppingListContent: React.FC<ShoppingListContentProps> = memo(({ 
  items, 
  onAddItem,
  onToggleItem, 
  onDeleteItem, 
  onEditItem,
  onClearCompleted,
  onReorder,
  onReorderEnd,
  isExpanded = false,
  isEditMode = false,
  checkboxStyle,
  isDraggingItemRef,
  onMoveItems
}) => {
  const [newItemName, setNewItemName] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddItem(newItemName.trim());
      setNewItemName('');
    }
  };

  const completedCount = items.filter(i => i.completed).length;

  return (
    <div 
      className={`flex flex-col h-full bg-m3-surface overflow-hidden ${isExpanded ? '' : 'rounded-b-[24px]'}`}
    >
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto min-h-0 flex flex-col ${isExpanded ? 'pt-4 lg:pt-8 px-4 lg:px-8' : 'px-4 py-2'}`}
        style={{ overflowAnchor: 'none' }}
      >
        {items.length > 0 ? (
          <Reorder.Group 
            axis="y" 
            values={items} 
            onReorder={onReorder} 
            className="flex flex-col gap-0 pb-2"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <ShoppingListItem 
                  key={item.id}
                  item={item}
                  onToggleItem={onToggleItem}
                  onDeleteItem={onDeleteItem}
                  onEditItem={onEditItem}
                  isExpanded={isExpanded || false}
                  isEditMode={isEditMode}
                  checkboxStyle={checkboxStyle}
                  onReorderEnd={onReorderEnd}
                  isDraggingItemRef={isDraggingItemRef}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        ) : (
          <div className="py-4 text-center">
            <p className="text-m3-on-surface-variant/40 text-sm font-medium italic">Your list is empty</p>
          </div>
        )}
      </div>

      {/* Footer Area Group */}
      <div 
        className="bg-m3-surface-container-low border-t border-m3-outline/5 shrink-0 flex flex-col overflow-hidden"
      >
        <AnimatePresence initial={false}>
          {completedCount > 0 && (
            <motion.div 
              key="batch-actions-footer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                height: { type: "spring", stiffness: 450, damping: 40, mass: 1 },
                opacity: { duration: 0.2 }
              }}
              className="flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-m3-on-surface-variant/50 uppercase tracking-widest">
                    Batch Actions
                  </span>
                  <span className="text-[10px] font-bold text-m3-on-surface-variant/40">
                    {completedCount} SELECTED
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onMoveItems}
                    className="flex-1 py-2 bg-m3-surface text-m3-tertiary rounded-xl hover:bg-m3-tertiary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10 text-center"
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={onClearCompleted}
                    className="flex-1 py-2 bg-m3-surface text-m3-primary rounded-xl hover:bg-m3-primary hover:text-white transition-all text-xs font-bold shadow-sm border border-m3-outline/10 text-center"
                  >
                    Purchased
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={handleAddItem} 
          className="px-4 py-4"
        >
          <input
            type="text"
            placeholder="Add an item"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full h-12 px-6 bg-m3-surface-variant/10 border border-m3-outline/10 rounded-full outline-none focus:ring-2 focus:ring-m3-primary/20 font-bold placeholder:text-m3-on-surface-variant/40 text-sm transition-all shadow-sm"
          />
        </form>
      </div>
    </div>
  );
});
