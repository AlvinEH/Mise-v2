import React, { useState, useEffect, memo } from 'react';
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
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Minimize2, Trash2, Edit2, X, MoveHorizontal, ChevronDown, ArrowRightLeft } from 'lucide-react';

import { db } from '../firebase';
import { StoreList, ShoppingItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { parseShoppingItem } from '../utils/shoppingItems';
import { PageHeader } from '../components/layout/PageHeader';
import { StoreCard } from '../components/shopping/StoreCard';
import { ShoppingListContent } from '../components/shopping/ShoppingListContent';
import { CheckboxStyle } from '../types';

interface ShoppingListPageProps {
  onMenuClick: () => void;
  user: User;
  checkboxStyle: CheckboxStyle;
}

const ReorderableStoreCard = memo(({ 
  list, 
  index, 
  shoppingItems, 
  handleAddItem, 
  handleToggleItem, 
  handleDeleteItem, 
  handleEditItem, 
  handleDeleteStore, 
  handleClearCompleted, 
  handleReorder, 
  syncReorderedItems, 
  handleExpand, 
  expandedCardId, 
  setExpandedCardId, 
  checkboxStyle,
  setIsDraggingList,
  syncReorderedLists,
  isDraggingListRef,
  isDraggingItemRef,
  onMoveItems
}: {
  list: StoreList;
  index: number;
  shoppingItems: ShoppingItem[];
  handleAddItem: (id: string, name: string) => void;
  handleToggleItem: (item: ShoppingItem) => void;
  handleDeleteItem: (id: string) => void;
  handleEditItem: (item: ShoppingItem) => void;
  handleDeleteStore: (id: string) => void;
  handleClearCompleted: (id: string) => void;
  handleReorder: (id: string, items: ShoppingItem[]) => void;
  syncReorderedItems: (id: string) => void;
  handleExpand: (id: string) => void;
  expandedCardId: string | null;
  setExpandedCardId: (id: string | null) => void;
  checkboxStyle: CheckboxStyle;
  setIsDraggingList: (isDragging: boolean) => void;
  syncReorderedLists: () => void;
  isDraggingListRef: React.MutableRefObject<boolean>;
  isDraggingItemRef: React.MutableRefObject<boolean>;
  onMoveItems: (id: string) => void;
}) => {
  return (
    <Reorder.Item
      key={list.id}
      value={list}
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      onDragStart={() => {
        setIsDraggingList(true);
        isDraggingListRef.current = true;
      }}
      onDragEnd={() => {
        setIsDraggingList(false);
        // Delay resetting the ref so click handlers can check it
        setTimeout(() => {
          isDraggingListRef.current = false;
        }, 100);
        syncReorderedLists();
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout="position"
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="relative group"
      style={{ touchAction: 'none' }}
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
        onReorderEnd={() => syncReorderedItems(list.id)}
        onExpand={() => {
          if (isDraggingListRef.current) return;
          handleExpand(list.id);
        }}
        isCollapsed={expandedCardId !== list.id}
        onToggleCollapse={() => {
          if (isDraggingListRef.current) return;
          setExpandedCardId(expandedCardId === list.id ? null : list.id);
        }}
        checkboxStyle={checkboxStyle}
        isDraggingItemRef={isDraggingItemRef}
        onMoveItems={onMoveItems}
      />
    </Reorder.Item>
  );
});

export const ShoppingListPage = ({ onMenuClick, user, checkboxStyle }: ShoppingListPageProps) => {
  const [storeLists, setStoreLists] = useState<StoreList[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [editItemName, setEditItemName] = useState('');
  const [storeToDelete, setStoreToDelete] = useState<StoreList | null>(null);
  const [storeToMove, setStoreToMove] = useState<string | null>(null);
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [editStoreNameValue, setEditStoreNameValue] = useState('');
  const pendingUpdatesRef = React.useRef<Map<string, ShoppingItem[]>>(new Map());
  const isSyncingRef = React.useRef(false);
  const isSyncingListsRef = React.useRef(false);
  const pendingListsRef = React.useRef<StoreList[] | null>(null);

  const isDraggingListRef = React.useRef(false);
  const isDraggingItemRef = React.useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddingStore) setIsAddingStore(false);
        else if (editingItem) setEditingItem(null);
        else if (storeToDelete) setStoreToDelete(null);
        else if (isEditingStoreName) setIsEditingStoreName(false);
        else if (isEditMode) setIsEditMode(false);
        else if (expandedListId) setExpandedListId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddingStore, editingItem, storeToDelete, isEditingStoreName, isEditMode, expandedListId]);

  useEffect(() => {
    const handlePopState = () => {
      if (expandedListId) {
        setExpandedListId(null);
        setIsEditMode(false);
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
      setIsEditMode(false);
      window.history.back();
    }
  }, [expandedListId]);

  useEffect(() => {
    if (!user) return;

    const qLists = query(
      collection(db, 'storeLists'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
    const unsubscribeLists = onSnapshot(qLists, (snapshot) => {
      if (!isSyncingListsRef.current && !isDraggingListRef.current) {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreList));
        // Sort in memory to handle documents without the 'order' field
        setStoreLists(lists.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'storeLists'));

    const qItems = query(
      collection(db, 'shoppingItems'),
      where('userId', '==', user.uid),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      // Only update if we're not in the middle of an optimistic reorder sync
      // and not dragging a list (since list contents might shift)
      if (!isSyncingRef.current && !isDraggingItemRef.current && !isDraggingListRef.current) {
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
      const maxOrder = storeLists.length > 0 ? Math.max(...storeLists.map(l => l.order || 0)) : -1;
      await addDoc(collection(db, 'storeLists'), {
        name: newStoreName.trim(),
        userId: user.uid,
        order: maxOrder + 1,
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
      
      // Use a batch for deleting items to be more efficient and atomic
      const batch = writeBatch(db);
      itemsToDelete.forEach(item => {
        batch.delete(doc(db, 'shoppingItems', item.id));
      });
      await batch.commit();

      if (expandedListId === id) {
        setExpandedListId(null);
      }
      setStoreToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'storeLists/' + id);
    }
  };

  const handleMoveStoreItems = async (sourceStoreId: string, targetStoreId: string) => {
    if (sourceStoreId === targetStoreId) return;
    
    try {
      const itemsToMove = shoppingItems.filter(item => item.storeListId === sourceStoreId && item.completed);
      const batch = writeBatch(db);
      
      // Get max order in target store
      const targetItems = shoppingItems.filter(item => item.storeListId === targetStoreId);
      let maxOrder = targetItems.length > 0 
        ? Math.max(...targetItems.map(i => i.order ?? 0)) 
        : -1;

      itemsToMove.forEach((item) => {
        maxOrder++;
        batch.update(doc(db, 'shoppingItems', item.id), {
          storeListId: targetStoreId,
          order: maxOrder,
          completed: false,
          movedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      setStoreToMove(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'shopping/moveStore');
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

  const handleStartEditStoreName = (name: string) => {
    setEditStoreNameValue(name);
    setIsEditingStoreName(true);
  };

  const handleUpdateStoreName = async () => {
    if (!expandedListId || !editStoreNameValue.trim() || !isEditingStoreName) {
      setIsEditingStoreName(false);
      return;
    }

    const currentStore = storeLists.find(l => l.id === expandedListId);
    if (currentStore && currentStore.name === editStoreNameValue.trim()) {
      setIsEditingStoreName(false);
      return;
    }

    setIsEditingStoreName(false); // Set to false immediately to prevent multiple calls
    try {
      await updateDoc(doc(db, 'storeLists', expandedListId), {
        name: editStoreNameValue.trim(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'storeLists/' + expandedListId);
    }
  };

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

  const getInventoryLocationAndCategory = (itemName: string): { location: string; category: 'ingredient' | 'supply' } => {
    const name = itemName.toLowerCase();
    
    // Washroom items
    const washroomItems = [
      'toilet cleaner', 'toilet paper', 'toothpaste', 'face wash', 'tooth paste', 
      'soap', 'shampoo', 'conditioner', 'body wash', 'hand wash', 'mouthwash', 
      'floss', 'razor', 'shaving', 'deodorant', 'lotion', 'sunscreen', 'cotton', 
      'q-tip', 'tampon', 'sanitary', 'pad', 'liner', 'diaper', 'wipe', 'shower gel', 'bath', 
      'cleanser', 'moisturizer', 'serum', 'toner', 'hair spray', 'hair gel', 
      'toothbrush', 'dental'
    ];
    // Closet items
    const closetItems = [
      'paper towels', 'tissue paper', 'tissue', 'filter', 'dish soap', 
      'detergent', 'trash bag', 'recycle bag', 'swiffer', 'duster',
      'cleaning', 'sponge', 'bleach', 'windex', 'multipurpose cleaner', 'air freshener'
    ];
    // Freezer keywords
    const freezerKeywords = ['frozen', 'ice cream', 'sorbet', 'gelato', 'popsicle', 'frozen vegetables', 'frozen fruit'];
    // Pantry keywords
    const pantryKeywords = [
      'flour', 'sugar', 'rice', 'pasta', 'canned', 'dry', 'spice', 'oil', 'vinegar', 
      'honey', 'cereal', 'snack', 'nut', 'seed', 'bean', 'lentil', 'grain', 'baking',
      'salt', 'pepper', 'coffee', 'tea', 'pasta sauce', 'tomato sauce', 'broth',
      'stock', 'cracker', 'chip', 'cookie', 'bread', 'oats', 'syrup', 'jam', 'peanut butter',
      'mirin'
    ];

    if (washroomItems.some(item => name.includes(item))) {
      return { location: 'Washroom', category: 'supply' };
    }
    if (closetItems.some(item => name.includes(item))) {
      return { location: 'Closet', category: 'supply' };
    }
    if (freezerKeywords.some(keyword => name.includes(keyword))) {
      return { location: 'Freezer', category: 'ingredient' };
    }
    if (pantryKeywords.some(keyword => name.includes(keyword))) {
      return { location: 'Pantry', category: 'ingredient' };
    }
    
    // Default to Refrigerator for groceries
    return { location: 'Refrigerator', category: 'ingredient' };
  };

  const handleClearCompleted = React.useCallback(async (storeListId: string) => {
    const completedItems = shoppingItems.filter(item => item.storeListId === storeListId && item.completed);
    
    if (completedItems.length === 0) return;

    // Find store name
    const storeList = storeLists.find(l => l.id === storeListId);
    const storeName = storeList ? storeList.name : '';

    const batch = writeBatch(db);
    
    for (const item of completedItems) {
      const { location, category } = getInventoryLocationAndCategory(item.name);
      
      const newInventoryRef = doc(collection(db, 'inventory'));
      batch.set(newInventoryRef, {
        name: item.name,
        category,
        location,
        quantity: item.amount || '',
        unit: item.unit || '',
        used: false,
        notes: storeName ? `Bought from ${storeName}` : '',
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      batch.delete(doc(db, 'shoppingItems', item.id));
    }
    
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shoppingItems/clearCompleted');
    }
  }, [shoppingItems, user.uid, storeLists]);

  const handleReorder = React.useCallback((storeListId: string, newItems: ShoppingItem[]) => {
    // 1. Update local state immediately for buttery smooth UI
    setShoppingItems(prevItems => {
      const otherItems = prevItems.filter(item => item.storeListId !== storeListId);
      return [...otherItems, ...newItems];
    });
    
    // Store the latest items in a ref to be used on drag end
    pendingUpdatesRef.current.set(storeListId, newItems);
  }, []);

  const syncReorderedItems = React.useCallback(async (storeListId: string) => {
    const newItems = pendingUpdatesRef.current.get(storeListId);
    if (!newItems || isSyncingRef.current) return;

    isSyncingRef.current = true;
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      newItems.forEach((item, index) => {
        if (item.order !== index) {
          const itemRef = doc(db, 'shoppingItems', item.id);
          batch.update(itemRef, { order: index });
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to sync reorder to Firestore:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'shoppingItems/reorder');
    } finally {
      isSyncingRef.current = false;
      pendingUpdatesRef.current.delete(storeListId);
    }
  }, []);

  const handleReorderLists = React.useCallback((newLists: StoreList[]) => {
    setStoreLists(newLists);
    pendingListsRef.current = newLists;
  }, []);

  const syncReorderedLists = React.useCallback(async () => {
    if (!pendingListsRef.current || isSyncingListsRef.current) return;
    
    const listsToSync = [...pendingListsRef.current];
    isSyncingListsRef.current = true;
    
    try {
      const batch = writeBatch(db);
      let hasChanges = false;
      
      listsToSync.forEach((list, index) => {
        if (list.order !== index) {
          batch.update(doc(db, 'storeLists', list.id), { order: index });
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to sync store lists reorder:', error);
    } finally {
      isSyncingListsRef.current = false;
      pendingListsRef.current = null;
    }
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
                className="bg-m3-surface rounded-[24px] border border-m3-outline/10 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                <form onSubmit={handleAddStore} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider px-1">
                      Store Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Whole Foods, Trader Joe's"
                      value={newStoreName}
                      onChange={e => setNewStoreName(e.target.value)}
                      autoCapitalize="sentences"
                      className="w-full px-4 py-3 bg-m3-surface-variant/10 border border-m3-outline/10 rounded-xl outline-none focus:border-m3-primary/30 font-bold text-sm transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsAddingStore(false)}
                      className="flex-1 px-4 py-3 text-m3-on-surface-variant font-bold text-sm hover:bg-m3-surface-variant/10 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={!newStoreName.trim()}
                      className="flex-[2] px-4 py-3 bg-m3-primary text-m3-on-primary font-bold text-sm rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                      Create
                    </button>
                  </div>
                </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {storeLists.length > 0 ? (
            <Reorder.Group 
              values={storeLists} 
              onReorder={handleReorderLists}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8"
            >
              {storeLists.map((list, index) => (
                <ReorderableStoreCard
                  key={list.id}
                  list={list}
                  index={index}
                  shoppingItems={shoppingItems}
                  handleAddItem={handleAddItem}
                  handleToggleItem={handleToggleItem}
                  handleDeleteItem={handleDeleteItem}
                  handleEditItem={handleEditItem}
                  handleDeleteStore={handleDeleteStore}
                  handleClearCompleted={handleClearCompleted}
                  handleReorder={handleReorder}
                  syncReorderedItems={syncReorderedItems}
                  handleExpand={handleExpand}
                  expandedCardId={expandedCardId}
                  setExpandedCardId={setExpandedCardId}
                  checkboxStyle={checkboxStyle}
                  setIsDraggingList={setIsDraggingList}
                  syncReorderedLists={syncReorderedLists}
                  isDraggingListRef={isDraggingListRef}
                  isDraggingItemRef={isDraggingItemRef}
                  onMoveItems={setStoreToMove}
                />
              ))}
            </Reorder.Group>
          ) : (
            <div className="text-center py-32 bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-sm">
              <h3 className="text-2xl font-black text-m3-on-surface mb-2">No shopping lists yet</h3>
              <p className="text-m3-on-surface-variant/60 font-medium mb-8">Add a store to start organizing your groceries.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <AnimatePresence>
        {!expandedListId && !expandedCardId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-40 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expandedListId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
          >
            <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {isEditingStoreName ? (
                  <input
                    autoFocus
                    type="text"
                    value={editStoreNameValue}
                    onChange={(e) => setEditStoreNameValue(e.target.value)}
                    onBlur={handleUpdateStoreName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateStoreName();
                      if (e.key === 'Escape') setIsEditingStoreName(false);
                    }}
                    className="text-2xl font-black text-m3-on-surface bg-m3-surface-variant/20 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-m3-primary w-full max-w-md"
                  />
                ) : (
                  <h2 
                    onClick={() => {
                      const list = storeLists.find(l => l.id === expandedListId);
                      if (list) handleStartEditStoreName(list.name);
                    }}
                    className="text-2xl font-black text-m3-on-surface truncate cursor-pointer hover:text-m3-primary transition-colors"
                    title="Click to rename"
                  >
                    {isEditMode ? 'Editing ' : ''}{storeLists.find(l => l.id === expandedListId)?.name}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all ${
                    isEditMode 
                      ? 'bg-m3-primary text-m3-on-primary shadow-md' 
                      : 'text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10'
                  }`}
                  title={isEditMode ? 'Done' : 'Edit'}
                >
                  {isEditMode ? <X size={20} /> : <Edit2 size={20} />}
                </button>
                <button 
                  onClick={handleCollapse}
                  className="flex items-center justify-center w-10 h-10 text-m3-on-surface-variant/60 font-bold hover:text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                  title="Reduce"
                >
                  <Minimize2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    const list = storeLists.find(l => l.id === expandedListId);
                    if (list) setStoreToDelete(list);
                  }}
                  className="flex items-center justify-center w-10 h-10 text-m3-error font-bold hover:bg-m3-error/10 rounded-xl transition-all"
                  title="Delete Store"
                >
                  <Trash2 size={20} />
                </button>
              </div>
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
                    onReorderEnd={() => syncReorderedItems(expandedList.id)}
                    isExpanded={true}
                    isEditMode={isEditMode}
                    checkboxStyle={checkboxStyle}
                    onMoveItems={() => setStoreToMove(expandedList.id)}
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

      {/* Delete Store Confirmation Modal */}
      <AnimatePresence>
        {storeToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
            onClick={() => setStoreToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-m3-surface-container-high rounded-[28px] p-8 w-full max-w-md shadow-2xl border border-m3-outline/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-medium text-m3-on-surface mb-4">
                Delete {storeToDelete.name}?
              </h3>
              <p className="text-m3-on-surface-variant mb-8">
                This will permanently delete this store and all its items. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStoreToDelete(null)}
                  className="px-6 py-2.5 text-m3-primary font-medium hover:bg-m3-primary/8 rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStore(storeToDelete.id)}
                  className="px-6 py-2.5 bg-m3-error text-m3-on-error font-medium hover:bg-m3-error/90 rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Store Modal */}
      <AnimatePresence>
        {storeToMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
            onClick={() => setStoreToMove(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-m3-surface-container-high rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-m3-outline/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-m3-primary/10 rounded-full flex items-center justify-center text-m3-primary">
                    <MoveHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-m3-on-surface leading-tight">Move Items</h3>
                    <p className="text-xs text-m3-on-surface-variant/60">
                      From {storeLists.find(s => s.id === storeToMove)?.name}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {storeLists.filter(s => s.id !== storeToMove).map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleMoveStoreItems(storeToMove, s.id)}
                      className="w-full text-left px-4 py-3 hover:bg-m3-primary/5 rounded-xl transition-all flex items-center justify-between group"
                    >
                      <span className="font-bold text-sm text-m3-on-surface group-hover:text-m3-primary transition-colors">{s.name}</span>
                      <ChevronDown size={16} className="text-m3-on-surface-variant/20 -rotate-90" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStoreToMove(null)}
                  className="w-full px-4 py-3 text-m3-on-surface-variant font-bold text-sm hover:bg-m3-surface-variant/10 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};