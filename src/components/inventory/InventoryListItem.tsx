import React, { memo, useRef } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Check, Trash2, ArrowRightLeft, GripVertical } from 'lucide-react';
import { InventoryItem, CheckboxStyle } from '../../types';
import { isItemSessionMoved } from '../../utils/session';

interface InventoryListItemProps {
  item: InventoryItem;
  onToggleUsed: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  isExpandedView?: boolean;
  isEditMode?: boolean;
  className?: string;
  checkboxStyle?: CheckboxStyle;
  isDraggingLocRef?: React.MutableRefObject<boolean>;
  onReorderEnd?: () => void;
}

export const InventoryListItem = memo(({ 
  item, 
  onToggleUsed, 
  onEdit, 
  onDelete, 
  isExpandedView = false,
  isEditMode = false,
  className = "",
  checkboxStyle = "square",
  isDraggingLocRef,
  onReorderEnd
}: InventoryListItemProps) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const dragControls = useDragControls();

  const isDraggingItem = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingItem.current = false;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!isDraggingItem.current) {
        isLongPress.current = true;
        onEdit(item);
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
    if (isDraggingLocRef?.current || isDraggingItem.current || isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isEditMode) {
      onEdit(item);
    } else {
      onToggleUsed(item);
    }
  };

  const isRecentlyMoved = isItemSessionMoved(item.id);

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
        if (isDraggingLocRef) isDraggingLocRef.current = true;
      }}
      onDragEnd={() => {
        if (isDraggingLocRef) {
          setTimeout(() => {
            isDraggingLocRef.current = false;
          }, 200);
        }
        setTimeout(() => {
          isDraggingItem.current = false;
        }, 200);
        if (onReorderEnd) onReorderEnd();
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2 group select-none ${item.used ? 'opacity-50' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {!isEditMode && (
        <button
          onClick={handleClick}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onTouchStartCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
          className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-all ${
            checkboxStyle === 'circle' ? 'rounded-full' : 'rounded'
          } ${
            item.used 
              ? 'bg-m3-primary border-m3-primary text-m3-on-primary' 
              : 'border-m3-outline hover:border-m3-primary'
          }`}
        >
          {item.used && <Check size={14} strokeWidth={3} />}
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
          <h4 className={`font-bold text-base text-m3-on-surface leading-tight ${item.used ? 'line-through' : ''}`}>
            {item.name}
          </h4>
          {isRecentlyMoved && (
            <span title="Recently moved">
              <ArrowRightLeft size={12} className="text-m3-primary shrink-0" />
            </span>
          )}
        </div>
      </div>
        <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant/60 font-medium">
          {item.quantity && (
            <span>
              {item.quantity} {item.unit}
            </span>
          )}
          {item.purchasedOn && (
            <span>
              {item.quantity ? '• ' : ''}{new Date(item.purchasedOn).toLocaleDateString()}
            </span>
          )}
          {isExpandedView && item.notes && (
            <span className="italic">
              {(item.quantity || item.purchasedOn) ? '• ' : ''}{item.notes}
            </span>
          )}
        </div>
      </div>
      <div 
        onPointerDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
        className={`flex items-center gap-2 transition-opacity ${isExpandedView ? (isEditMode ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-60 group-hover:opacity-100'}`}
      >
        <button
          onClick={() => onDelete(item)}
          className={`p-2 rounded-md transition-colors ${isExpandedView ? 'text-m3-on-surface-variant hover:text-red-600 hover:bg-red-50' : 'text-m3-on-surface-variant/40 hover:text-red-600 hover:bg-red-50'}`}
          title="Delete item"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </Reorder.Item>
  );
});
