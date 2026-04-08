import React, { memo, useState } from 'react';
import { ShoppingCart, Plus, CheckCircle2, Circle, Trash2, GripVertical } from 'lucide-react';
import { ShoppingItem } from '../../types';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';

interface ShoppingListContentProps {
  items: ShoppingItem[];
  onAddItem: (name: string) => void;
  onToggleItem: (item: ShoppingItem) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted: () => void;
  onReorder: (newItems: ShoppingItem[]) => void;
  isExpanded?: boolean;
}

const ShoppingListItem = memo(({ 
  item, 
  onToggleItem, 
  onDeleteItem, 
  isExpanded 
}: { 
  item: ShoppingItem; 
  onToggleItem: (item: ShoppingItem) => void; 
  onDeleteItem: (id: string) => void;
  isExpanded: boolean;
}) => {
  const controls = useDragControls();

  return (
    <Reorder.Item 
      layout
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, x: -10, height: 'auto' }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, scale: 0.95, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between py-0.5 hover:bg-m3-surface-variant/10 transition-colors group px-2 rounded-xl overflow-hidden"
    >
      <button 
        onClick={() => onToggleItem(item)}
        className="flex items-center gap-2 flex-1 text-left"
      >
        <div className={`p-1 rounded-full transition-colors ${item.completed ? 'text-m3-primary' : 'text-m3-on-surface-variant/30 group-hover:text-m3-on-surface-variant'}`}>
          {item.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </div>
        <div className={item.completed ? 'opacity-50 line-through' : ''}>
          <h4 className="font-black text-m3-on-surface text-sm leading-tight">{item.name}</h4>
          { (item.amount || item.unit || item.category) && (
            <p className="text-m3-on-surface-variant text-[10px] font-medium">
              {item.amount && `${item.amount} `}{item.unit && `${item.unit} `}{item.category && `• ${item.category}`}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onDeleteItem(item.id)}
          className="p-2 text-m3-on-surface-variant/30 hover:text-m3-error transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={18} />
        </button>
        {isExpanded && (
          <div 
            className="p-2 cursor-grab active:cursor-grabbing text-m3-on-surface-variant/30 hover:text-m3-primary transition-colors"
            onPointerDown={(e) => controls.start(e)}
          >
            <GripVertical size={18} />
          </div>
        )}
      </div>
    </Reorder.Item>
  );
});

export const ShoppingListContent: React.FC<ShoppingListContentProps> = memo(({ 
  items, 
  onAddItem,
  onToggleItem, 
  onDeleteItem, 
  onClearCompleted,
  onReorder,
  isExpanded = false
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
    <motion.div className={`flex flex-col h-full ${isExpanded ? 'p-4 lg:p-8' : 'p-2 gap-2'}`}>
      <motion.div className={`flex-1 ${isExpanded ? 'overflow-y-auto pr-2' : ''} flex flex-col gap-2`}>
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
                  className="flex justify-end px-2 overflow-hidden"
                >
                  <button
                    onClick={onClearCompleted}
                    className="text-xs font-black text-m3-error hover:underline transition-all uppercase tracking-wider py-1"
                  >
                    Clear Completed
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Reorder.Group axis="y" values={items} onReorder={onReorder} className="space-y-0">
              <AnimatePresence>
                {items.map((item) => (
                  <ShoppingListItem 
                    key={item.id}
                    item={item}
                    onToggleItem={onToggleItem}
                    onDeleteItem={onDeleteItem}
                    isExpanded={isExpanded}
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
        className={`${isExpanded ? 'pt-4 border-t border-m3-outline/5 mt-4' : 'sticky bottom-0 bg-transparent pt-1'}`}
      >
        <input
          type="text"
          placeholder="Add an item..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="w-full px-4 py-2 bg-m3-surface-variant/20 border border-m3-outline/5 rounded-xl outline-none focus:border-m3-primary/30 font-bold placeholder:text-m3-on-surface-variant/40 text-sm"
        />
      </motion.form>
    </motion.div>
  );
});
