import React, { memo, useRef } from 'react';
import { motion, Reorder, useDragControls } from 'motion/react';

interface ReorderableItemProps {
  item: any;
  id: string;
  isEditMode: boolean;
  onReorderEnd: () => void;
  children: (dragControls: any) => React.ReactNode;
  className?: string;
  isDraggingRef?: React.MutableRefObject<boolean>;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
}

export const ReorderableItem = memo(({ 
  item, 
  id,
  isEditMode, 
  onReorderEnd, 
  children,
  className = "",
  isDraggingRef,
  initial = { opacity: 0 },
  animate = { opacity: 1 },
  exit = { opacity: 0 },
  transition = { 
    layout: { type: "tween", duration: 0.2, ease: "circOut" },
    opacity: { duration: 0.2 }
  }
}: ReorderableItemProps) => {
  const dragControls = useDragControls();
  const isDraggingItem = useRef(false);

  return (
    <Reorder.Item
      value={item}
      id={id}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.02}
      onDragStart={() => {
        isDraggingItem.current = true;
        if (isDraggingRef) isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        if (isDraggingRef) {
          // Add a small delay to prevent click events immediately after drag
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 50);
        }
        setTimeout(() => {
          isDraggingItem.current = false;
        }, 50);
        onReorderEnd();
      }}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      layout="position"
      whileDrag={{ 
        scale: 1.02, 
        zIndex: 50,
        boxShadow: "0 8px 16px rgba(0,0,0,0.12)"
      }}
      className={className}
      style={{ position: 'relative', willChange: 'transform', transform: 'translate3d(0,0,0)' }}
    >
      {children(dragControls)}
    </Reorder.Item>
  );
});
