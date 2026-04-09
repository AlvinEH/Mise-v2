import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  Timestamp, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minimize2 } from 'lucide-react';

import { db } from '../firebase';
import { StoreList, ShoppingItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { parseShoppingItem } from '../utils/shoppingItems';
import { PageHeader } from '../components/layout/PageHeader';
import { StoreCard } from '../components/shopping/StoreCard';
import { ShoppingListContent } from '../components/shopping/ShoppingListContent';

interface ShoppingListPageProps {
  onMenuClick: () => void;
  user: User;
}

export const ShoppingListPage = ({ onMenuClick, user }: ShoppingListPageProps) => {
  const [storeLists, setStoreLists] = useState<StoreList[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = React.useRef<Map<string, ShoppingItem[]>>(new Map());
  const isSyncingRef = React.useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      if (expandedListId) {
        setExpandedListId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [expandedListId]);

  const handleExpand = React.useCallback((id: string) => {
    setExpandedListId(id);
    window.history.pushState({ expanded: id }, '');
  }, []);

  const handleCollapse = React.useCallback(() => {
    if (expandedListId) {
      setExpandedListId(null);
      window.history.back();
    }
  }, [expandedListId]);

  useEffect(() => {
    if (!user) return;

    const qLists = query(
      collection(db, 'storeLists'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeLists = onSnapshot(qLists, (snapshot) => {
      setStoreLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreList)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'storeLists'));

    const qItems = query(
      collection(db, 'shoppingItems'),
      where('userId', '==', user.uid),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      // Only update if we're not in the middle of an optimistic reorder sync
      if (!isSyncingRef.current && !syncTimeoutRef.current) {
        setShoppingItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem)));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shoppingItems'));

    return () => {
      unsubscribeLists();
      unsubscribeItems();
    };
  }, [user]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    try {
      await addDoc(collection(db, 'storeLists'), {
        name: newStoreName.trim(),
        userId: user.uid,
        createdAt: Timestamp.now()
      });
      setNewStoreName('');
      setIsAddingStore(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'storeLists');
    }
  };

  const handleDeleteStore = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'storeLists', id));
      // Also delete items for this store
      const itemsToDelete = shoppingItems.filter(item => item.storeListId === id);
      for (const item of itemsToDelete) {
        await deleteDoc(doc(db, 'shoppingItems', item.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'storeLists/' + id);
    }
  };

  const handleAddItem = React.useCallback(async (storeListId: string, name: string) => {
    if (!name.trim()) return;
    
    // Parse the item name to extract units
    const parsed = parseShoppingItem(name.trim());
    
    try {
      // Get current max order for this store
      const storeItems = shoppingItems.filter(i => i.storeListId === storeListId);
      const maxOrder = storeItems.length > 0 ? Math.max(...storeItems.map(i => i.order)) : -1;

      const itemData: any = {
        storeListId,
        name: parsed.name,
        completed: false,
        order: maxOrder + 1,
        userId: user.uid,
        createdAt: Timestamp.now()
      };

      if (parsed.amount) itemData.amount = parsed.amount;
      if (parsed.unit) itemData.unit = parsed.unit;

      await addDoc(collection(db, 'shoppingItems'), itemData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingItems');
    }
  }, [user.uid, shoppingItems]);

  const handleToggleItem = React.useCallback(async (item: ShoppingItem) => {
    try {
      await updateDoc(doc(db, 'shoppingItems', item.id), {
        completed: !item.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'shoppingItems/' + item.id);
    }
  }, []);

  const handleDeleteItem = React.useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'shoppingItems/' + id);
    }
  }, []);

  const handleEditItem = React.useCallback((item: ShoppingItem) => {
    setEditingItem(item);
    setEditItemName(`${item.amount ? item.amount + ' ' : ''}${item.unit ? item.unit + ' ' : ''}${item.name}`);
  }, []);

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;

    const parsed = parseShoppingItem(editItemName.trim());
    
    try {
      const updateData: any = {
        name: parsed.name,
        updatedAt: Timestamp.now()
      };
      
      // Explicitly set or remove amount/unit based on parsing
      updateData.amount = parsed.amount || null;
      updateData.unit = parsed.unit || null;

      await updateDoc(doc(db, 'shoppingItems', editingItem.id), updateData);
      setEditingItem(null);
      setEditItemName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'shoppingItems/' + editingItem.id);
    }
  };

  const handleClearCompleted = React.useCallback(async (storeListId: string) => {
    const completedItems = shoppingItems.filter(item => item.storeListId === storeListId && item.completed);
    for (const item of completedItems) {
      await deleteDoc(doc(db, 'shoppingItems', item.id));
    }
  }, [shoppingItems]);

  const handleReorder = React.useCallback((storeListId: string, newItems: ShoppingItem[]) => {
    // 1. Update local state immediately for buttery smooth UI
    setShoppingItems(prevItems => {
      const otherItems = prevItems.filter(item => item.storeListId !== storeListId);
      const updatedItems = newItems.map((item, index) => ({ ...item, order: index }));
      return [...otherItems, ...updatedItems].sort((a, b) => a.order - b.order);
    });

    // 2. Queue the update for Firestore with debouncing
    pendingUpdatesRef.current.set(storeListId, newItems);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const updatesToSync = new Map(pendingUpdatesRef.current);
      pendingUpdatesRef.current.clear();

      if (updatesToSync.size === 0) {
        syncTimeoutRef.current = null;
        return;
      }

      isSyncingRef.current = true;
      try {
        const batch = writeBatch(db);
        let hasChanges = false;

        updatesToSync.forEach((items) => {
          items.forEach((item, index) => {
            if (item.order !== index) {
              const itemRef = doc(db, 'shoppingItems', item.id);
              batch.update(itemRef, { order: index });
              hasChanges = true;
            }
          });
        });

        if (hasChanges) {
          await batch.commit();
        }
      } catch (error) {
        console.error('Failed to sync reorder to Firestore:', error);
        handleFirestoreError(error, OperationType.UPDATE, 'shoppingItems/reorder');
      } finally {
        isSyncingRef.current = false;
        syncTimeoutRef.current = null;
      }
    }, 1000);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
      <PageHeader 
        title="Shopping List" 
        onMenuClick={onMenuClick} 
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 min-h-0">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence>
            {isAddingStore && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
                className="bg-m3-surface-variant/10 rounded-xl border border-m3-outline/10 overflow-hidden"
              >
                <div className="p-4">
                <form onSubmit={handleAddStore} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Enter store name"
                    value={newStoreName}
                    onChange={e => setNewStoreName(e.target.value)}
                    autoCapitalize="sentences"
                    className="w-full px-4 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary font-bold text-sm"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsAddingStore(false)}
                      className="flex-[0.4] py-2 px-4 border border-m3-outline text-m3-primary rounded-xl font-medium hover:bg-m3-primary/8 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[0.6] py-2 px-4 bg-m3-primary text-m3-on-primary rounded-xl font-medium hover:bg-m3-primary/90 shadow-sm hover:shadow-md transition-all whitespace-nowrap text-sm"
                    >
                      Add Store
                    </button>
                  </div>
                </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {storeLists.length > 0 ? (
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8"
            >
              {storeLists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: index * 0.05
                  }}
                >
                  <StoreCard 
                    list={list} 
                  items={shoppingItems.filter(item => item.storeListId === list.id)}
                  onAddItem={(name) => handleAddItem(list.id, name)}
                  onToggleItem={handleToggleItem}
                  onDeleteItem={handleDeleteItem}
                  onEditItem={handleEditItem}
                  onDeleteStore={() => handleDeleteStore(list.id)}
                  onClearCompleted={() => handleClearCompleted(list.id)}
                  onReorder={(newItems) => handleReorder(list.id, newItems)}
                  onExpand={() => handleExpand(list.id)}
                />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-m3-surface-variant/10 rounded-xl border-2 border-dashed border-m3-outline/20">
              <h3 className="text-2xl font-bold text-m3-on-surface mb-2">No shopping lists yet</h3>
              <p className="text-m3-on-surface-variant font-medium mb-8">Add a store to start organizing your groceries.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
        <motion.button 
          onClick={() => setIsAddingStore(!isAddingStore)}
          animate={{ 
            rotate: isAddingStore ? 45 : 0,
            backgroundColor: isAddingStore ? "var(--m3-secondary)" : "var(--m3-primary-container)",
            color: isAddingStore ? "var(--m3-on-secondary)" : "var(--m3-on-primary-container)"
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 35,
            backgroundColor: { duration: 0.2 },
            color: { duration: 0.2 }
          }}
          className="w-14 h-14 rounded-[16px] shadow-md flex items-center justify-center group relative overflow-hidden will-change-transform"
          title="Add Store"
        >
          <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.08] transition-opacity" />
          <div className="relative z-10">
            <Plus size={24} strokeWidth={2} />
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {expandedListId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
          >
            <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-m3-on-surface truncate">
                  {storeLists.find(l => l.id === expandedListId)?.name}
                </h2>
              </div>
              <button 
                onClick={handleCollapse}
                className="flex items-center gap-2 px-4 py-2 text-m3-on-surface-variant/60 font-bold hover:text-m3-primary transition-all"
              >
                <Minimize2 size={20} />
                <span className="hidden sm:inline">Reduce</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
              {(() => {
                const expandedList = storeLists.find(l => l.id === expandedListId);
                if (!expandedList) return null;
                return (
                  <ShoppingListContent 
                    items={shoppingItems.filter(item => item.storeListId === expandedList.id)}
                    onAddItem={(name) => handleAddItem(expandedList.id, name)}
                    onToggleItem={handleToggleItem}
                    onDeleteItem={handleDeleteItem}
                    onEditItem={handleEditItem}
                    onClearCompleted={() => handleClearCompleted(expandedList.id)}
                    onReorder={(newItems) => handleReorder(expandedList.id, newItems)}
                    isExpanded={true}
                  />
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-m3-surface-container-high rounded-[28px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-m3-outline-variant/20">
                <h2 className="text-xl font-black text-m3-on-surface">Edit Item</h2>
              </div>
              <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
                <input
                  type="text"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-m3-surface-container-highest border-none text-m3-on-surface placeholder-m3-on-surface-variant/50 focus:ring-2 focus:ring-m3-primary transition-all font-bold"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-3 rounded-2xl border border-m3-outline text-m3-primary font-bold hover:bg-m3-primary/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-m3-primary text-m3-on-primary font-bold hover:shadow-lg transition-all active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};