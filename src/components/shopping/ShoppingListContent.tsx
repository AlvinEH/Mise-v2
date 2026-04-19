import React, { memo, useState, useMemo, useRef } from 'react';
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
      layout
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
      initial={{ opacity: 0, x: -10, height: 'auto' }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, scale: 0.95, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddItem(newItemName.trim());
      setNewItemName('');
    }
  };

  const completedCount = items.filter(i => i.completed).length;

  return (
    <motion.div className={`flex flex-col h-full ${isExpanded ? 'p-4 lg:p-8' : ''}`}>
      <motion.div className={`flex-1 flex flex-col gap-2 min-h-0 ${isExpanded ? '' : 'px-4 pb-2'}`}>
        {items.length > 0 ? (
          <>
            <AnimatePresence>
              {completedCount > 0 && (
                <motion.div 
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ 
                    duration: 0.2,
                    ease: "easeInOut"
                  }}
                  className="flex justify-between items-center px-2 overflow-hidden shrink-0 mb-1"
                >
                  <button
                    onClick={onMoveItems}
                    className="text-[10px] font-black text-m3-primary hover:underline transition-all uppercase tracking-wider py-1"
                  >
                    Move to Store
                  </button>
                  <button
                    onClick={onClearCompleted}
                    className="text-[10px] font-black text-m3-error hover:underline transition-all uppercase tracking-wider py-1"
                  >
                    Purchased
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Reorder.Group 
              axis="y" 
              values={items} 
              onReorder={onReorder} 
              className={`space-y-0 ${isExpanded ? 'overflow-y-auto pr-2 flex-1' : ''}`}
            >
              <AnimatePresence>
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
          </>
        ) : (
          <motion.div 
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 text-center"
          >
            <p className="text-m3-on-surface-variant/40 text-sm font-medium italic">Your list is empty</p>
          </motion.div>
        )}
      </motion.div>

      <motion.form 
        layout
        onSubmit={handleAddItem} 
        className={`${isExpanded 
          ? 'pt-4 border-t border-m3-outline/5 mt-4' 
          : 'sticky bottom-0 bg-m3-surface-container-low px-6 py-4 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)]'
        }`}
      >
        <input
          type="text"
          placeholder="Add an item"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/10 rounded-xl outline-none focus:border-m3-primary/30 font-bold placeholder:text-m3-on-surface-variant/40 text-sm transition-all"
        />
      </motion.form>
    </motion.div>
  );
});
