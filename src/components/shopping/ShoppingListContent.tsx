import React, { memo, useState } from 'react';
import { ShoppingCart, Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { ShoppingItem } from '../../types';

interface ShoppingListContentProps {
  items: ShoppingItem[];
  onAddItem: (name: string) => void;
  onToggleItem: (item: ShoppingItem) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted: () => void;
  onReorder: (newItems: ShoppingItem[]) => void;
  isExpanded?: boolean;
}

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

  if (items.length === 0 && !isExpanded) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-m3-surface-variant/30 rounded-full flex items-center justify-center mx-auto text-m3-on-surface-variant/50">
          <ShoppingCart size={40} />
        </div>
        <div>
          <h3 className="text-xl font-black text-m3-on-surface">Your list is empty</h3>
          <p className="text-m3-on-surface-variant">Add items manually or from your recipes.</p>
        </div>
      </div>
    );
  }

  const completedCount = items.filter(i => i.completed).length;

  return (
    <div className={`space-y-6 ${isExpanded ? 'p-4 lg:p-8 overflow-y-auto h-full' : 'p-4'}`}>
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          placeholder="Add an item (e.g., 2 cups milk)"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 px-6 py-4 bg-m3-surface-variant/30 border border-m3-outline/10 rounded-2xl outline-none focus:border-m3-primary font-bold"
        />
        <button
          type="submit"
          className="w-14 h-14 bg-m3-primary text-m3-on-primary rounded-2xl flex items-center justify-center hover:bg-m3-primary/90 transition-all shadow-sm"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </form>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-bold text-m3-on-surface-variant uppercase tracking-widest">
          {items.length} Items • {completedCount} Completed
        </p>
        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            className="text-sm font-black text-m3-error hover:underline transition-all"
          >
            Clear Completed
          </button>
        )}
      </div>

      <div className="bg-m3-surface-variant/30 rounded-[32px] border border-m3-outline/10 overflow-hidden">
        <div className="divide-y divide-m3-outline/5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-6 hover:bg-m3-surface-variant/50 transition-colors group">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onToggleItem(item)}
                  className={`p-2 rounded-full transition-colors ${item.completed ? 'text-m3-primary' : 'text-m3-on-surface-variant/30 hover:text-m3-on-surface-variant'}`}
                >
                  {item.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                </button>
                <div className={item.completed ? 'opacity-50 line-through' : ''}>
                  <h4 className="font-black text-m3-on-surface text-lg leading-tight">{item.name}</h4>
                  <p className="text-m3-on-surface-variant text-sm font-medium">
                    {item.amount && `${item.amount} `}{item.unit && `${item.unit} `}{item.category && `• ${item.category}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-2 text-m3-on-surface-variant/30 hover:text-m3-error transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
