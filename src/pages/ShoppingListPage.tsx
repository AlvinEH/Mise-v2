import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
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
import { motion, AnimatePresence, Reorder, useDragControls, LayoutGroup } from 'motion/react';
import { Plus, Minimize2, Trash2, Edit2, X, MoveHorizontal, ChevronDown, ArrowRightLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

import { db } from '../firebase';
import { StoreList, ShoppingItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { parseShoppingItem } from '../utils/shoppingItems';
import { markItemAsSessionMoved } from '../utils/session';
import { PageHeader } from '../components/layout/PageHeader';
import { useToast } from '../contexts/ToastContext';
import { suggestLocationsBatched } from '../services/geminiService';
import { StoreCardWrapper } from '../components/shopping/StoreCardWrapper';
import { SortStoresModal } from '../components/shopping/SortStoresModal';
import { EditItemModal } from '../components/shopping/EditItemModal';
import { DeleteStoreModal } from '../components/shopping/DeleteStoreModal';
import { MoveStoreItemsModal } from '../components/shopping/MoveStoreItemsModal';
import { StoreExpandedView } from '../components/shopping/StoreExpandedView';
import { STORAGE_KEYS, cacheData, getCachedData } from '../utils/cache';
import { CheckboxStyle } from '../types';

interface ShoppingListPageProps {
  onMenuClick: () => void;
  user: User;
  checkboxStyle: CheckboxStyle;
  aiAutoSort?: boolean;
}

export const ShoppingListPage = ({ onMenuClick, user, checkboxStyle, aiAutoSort = false }: ShoppingListPageProps) => {
  const { addToast } = useToast();
  const [storeLists, setStoreLists] = useState<StoreList[]>(() => getCachedData<StoreList[]>(STORAGE_KEYS.SHOPPING_LISTS) || []);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => getCachedData<ShoppingItem[]>(STORAGE_KEYS.SHOPPING_ITEMS) || []);
  const [newStoreName, setNewStoreName] = useState('');
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSortingStores, setIsSortingStores] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [editItemName, setEditItemName] = useState('');
  const [storeToDelete, setStoreToDelete] = useState<StoreList | null>(null);
  const [storeToMove, setStoreToMove] = useState<string | null>(null);
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [inventoryLocations, setInventoryLocations] = useState<any[]>([]);
  const [autoSortRules, setAutoSortRules] = useState<any[]>([]);
  const [editStoreNameValue, setEditStoreNameValue] = useState('');
  const pendingUpdatesRef = useRef<Map<string, ShoppingItem[]>>(new Map());
  const isSyncingRef = useRef(false);
  const isSyncingListsRef = useRef(false);
  const pendingListsRef = useRef<StoreList[] | null>(null);

  const isDraggingListRef = useRef(false);
  const isDraggingItemRef = useRef(false);

  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    const cachedLists = getCachedData<StoreList[]>(STORAGE_KEYS.SHOPPING_LISTS);
    return !(cachedLists && cachedLists.length > 0);
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddingStore) setIsAddingStore(false);
        else if (editingItem) setEditingItem(null);
        else if (storeToDelete) setStoreToDelete(null);
        else if (isEditingStoreName) setIsEditingStoreName(false);
        else if (isEditMode) setIsEditMode(false);
        else if (expandedListId) setExpandedListId(null);
        else if (isSortingStores) setIsSortingStores(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddingStore, editingItem, storeToDelete, isEditingStoreName, isEditMode, expandedListId, isSortingStores]);

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

  const handleExpand = useCallback((id: string) => {
    setExpandedListId(id);
    window.history.pushState({ expanded: id }, '');
  }, []);

  const handleCollapse = useCallback(() => {
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
      where('userId', '==', user.uid)
    );
    const unsubscribeLists = onSnapshot(qLists, (snapshot) => {
      if (!isSyncingListsRef.current && !isDraggingListRef.current) {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreList));
        // Sort in memory to handle documents without the 'order' field
        const sortedLists = lists.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        setStoreLists(sortedLists);
        cacheData(STORAGE_KEYS.SHOPPING_LISTS, sortedLists);
        setIsInitialLoad(false);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'storeLists'));

    const qItems = query(
      collection(db, 'shoppingItems'),
      where('userId', '==', user.uid)
    );
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      // Only update if we're not in the middle of an optimistic reorder sync
      // and not dragging a list (since list contents might shift)
      if (!isSyncingRef.current && !isDraggingItemRef.current && !isDraggingListRef.current) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
        const sortedItems = items.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.id.localeCompare(b.id);
        });
        setShoppingItems(sortedItems);
        cacheData(STORAGE_KEYS.SHOPPING_ITEMS, sortedItems);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shoppingItems'));

    const qInvLocs = query(
      collection(db, 'inventoryLocations'),
      where('userId', '==', user.uid)
    );
    const unsubscribeInvLocs = onSnapshot(qInvLocs, (snapshot) => {
      setInventoryLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventoryLocations'));

    const qRules = query(
      collection(db, 'inventoryAutoSortRules'),
      where('userId', '==', user.uid)
    );
    const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
      setAutoSortRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventoryAutoSortRules'));

    return () => {
      unsubscribeLists();
      unsubscribeItems();
      unsubscribeInvLocs();
      unsubscribeRules();
    };
  }, [user]);

  const handleMoveStoreOrder = async (index: number, direction: 'up' | 'down') => {
    const lists = [...storeLists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === lists.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = lists[index];
    lists[index] = lists[newIndex];
    lists[newIndex] = temp;

    // Update orders
    const updatedLists = lists.map((list, i) => ({
      ...list,
      order: i
    }));

    // Update local state
    setStoreLists(updatedLists);

    // Update DB
    try {
      const batch = writeBatch(db);
      updatedLists.forEach(list => {
        batch.update(doc(db, 'storeLists', list.id), {
          order: list.order
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to update store order:', error);
    }
  };

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
      addToast(`Store and its items deleted`, 'success');

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
        markItemAsSessionMoved(item.id);
        batch.update(doc(db, 'shoppingItems', item.id), {
          storeListId: targetStoreId,
          order: maxOrder,
          completed: false,
          movedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      addToast(`${itemsToMove.length} items moved to target store`, 'move');
      setStoreToMove(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'shopping/moveStore');
    }
  };

  const handleAddItem = useCallback(async (storeListId: string, name: string) => {
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

  const handleToggleItem = useCallback(async (item: ShoppingItem) => {
    try {
      await updateDoc(doc(db, 'shoppingItems', item.id), {
        completed: !item.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'shoppingItems/' + item.id);
    }
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'shoppingItems/' + id);
    }
  }, []);

  const handleEditItem = useCallback((item: ShoppingItem) => {
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

  const getInventoryLocationAndCategory = (itemName: string, _currentLocations: any[]): { location: string; category: 'ingredient' | 'supply' } => {
    const name = itemName.toLowerCase();
    
    // 1. Check unified rules (Highest priority)
    const rule = autoSortRules.find(rule => name.includes(rule.keyword.toLowerCase()));
    if (rule) {
      return { location: rule.location, category: rule.category };
    }
    
    // Default to Refrigerator for groceries
    return { location: 'Refrigerator', category: 'ingredient' };
  };

  const handleClearCompleted = useCallback(async (storeListId: string) => {
    const completedItems = shoppingItems.filter(item => item.storeListId === storeListId && item.completed);
    
    if (completedItems.length === 0) return;

    // Find store name
    const storeList = storeLists.find(l => l.id === storeListId);
    const storeName = storeList ? storeList.name : '';

    const batch = writeBatch(db);
    
    // AI Auto-Sort logic if enabled
    let aiSuggestions = new Map<string, { location: string; category: 'ingredient' | 'supply' }>();
    if (aiAutoSort) {
      const itemsToSuggest = completedItems
        .filter(item => {
          const name = item.name.toLowerCase();
          // Only ask AI if no dynamic user rule exists
          return !autoSortRules.find(rule => name.includes(rule.keyword.toLowerCase()));
        })
        .map(item => item.name);

      if (itemsToSuggest.length > 0) {
        addToast('AI is auto-sorting new items...', 'info');
        try {
          aiSuggestions = await suggestLocationsBatched(itemsToSuggest, autoSortRules);
        } catch (error) {
          console.error("AI Auto-sort failed, falling back to defaults", error);
        }
      }
    }
    
    const addedRuleKeywords = new Set<string>();

    for (const item of completedItems) {
      let { location, category } = getInventoryLocationAndCategory(item.name, inventoryLocations);
      
      // If AI suggested something, check if we should use it
      const itemNameLower = item.name.toLowerCase();
      const aiSuggestion = aiSuggestions.get(itemNameLower);
      if (aiSuggestion) {
        // Find existing location that matches suggested location (fuzzy)
        const existingLoc = inventoryLocations.find(loc => 
          loc.name.toLowerCase() === aiSuggestion.location.toLowerCase() ||
          loc.name.toLowerCase().includes(aiSuggestion.location.toLowerCase()) ||
          aiSuggestion.location.toLowerCase().includes(loc.name.toLowerCase())
        );
        
        location = existingLoc ? existingLoc.name : aiSuggestion.location;
        category = aiSuggestion.category;

        // Auto-save the AI suggestion as a rule for next time
        const ruleExists = autoSortRules.some(r => r.keyword.toLowerCase() === itemNameLower);
        if (!ruleExists && !addedRuleKeywords.has(itemNameLower)) {
          const newRuleRef = doc(collection(db, 'inventoryAutoSortRules'));
          batch.set(newRuleRef, {
            keyword: itemNameLower,
            location,
            category,
            userId: user.uid,
            createdAt: Timestamp.now()
          });
          addedRuleKeywords.add(itemNameLower);
        }
      }

      const newInventoryRef = doc(collection(db, 'inventory'));
      batch.set(newInventoryRef, {
        name: item.name,
        category,
        location,
        quantity: item.amount || '',
        unit: item.unit || '',
        used: false,
        purchasedOn: new Date().toISOString().split('T')[0],
        notes: storeName ? `Bought from ${storeName}` : '',
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      batch.delete(doc(db, 'shoppingItems', item.id));
    }
    
    try {
      await batch.commit();
      const rulesMessage = addedRuleKeywords.size > 0 
        ? ` (AI learned ${addedRuleKeywords.size} new rules)` 
        : '';
      addToast(`${completedItems.length} items moved to inventory${rulesMessage}`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shoppingItems/clearCompleted');
    }
  }, [shoppingItems, user.uid, storeLists, inventoryLocations, aiAutoSort, autoSortRules, getInventoryLocationAndCategory]);

  const handleReorder = useCallback((storeListId: string, newItems: ShoppingItem[]) => {
    // 1. Update local state immediately for buttery smooth UI
    setShoppingItems(prevItems => {
      const otherItems = prevItems.filter(item => item.storeListId !== storeListId);
      return [...otherItems, ...newItems];
    });
    
    // Store the latest items in a ref to be used on drag end
    pendingUpdatesRef.current.set(storeListId, newItems);
  }, []);

  const syncReorderedItems = useCallback(async (storeListId: string) => {
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

  const handleReorderLists = useCallback((newLists: StoreList[]) => {
    setStoreLists(newLists);
    pendingListsRef.current = newLists;
  }, []);

  const syncReorderedLists = useCallback(async () => {
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
        actions={
          <button
            onClick={() => setIsSortingStores(true)}
            className="p-2 text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
            title="Sort Stores"
          >
            <ArrowUpDown size={20} />
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 min-h-0">
        <div className="max-w-7xl mx-auto">
          {isInitialLoad ? (
            <div className="flex-1 flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-m3-primary/20 border-t-m3-primary rounded-full animate-spin" />
                <p className="text-m3-on-surface-variant/60 font-medium animate-pulse">Loading shopping list...</p>
              </div>
            </div>
          ) : (
            <>
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
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsAddingStore(false)}
                      className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={!newStoreName.trim()}
                      className="px-8 py-2.5 bg-m3-primary text-m3-on-primary rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                    >
                      Create
                    </button>
                  </div>
                </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <LayoutGroup id="shopping-lists">
            {storeLists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8">
                {storeLists.map((list) => (
                    <StoreCardWrapper
                      key={list.id}
                      list={list}
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
                      isDraggingItemRef={isDraggingItemRef}
                      onMoveItems={setStoreToMove}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-sm">
                <h3 className="text-2xl font-black text-m3-on-surface mb-2">No shopping lists yet</h3>
                <p className="text-m3-on-surface-variant/60 font-medium mb-8">Add a store to start organizing your groceries.</p>
              </div>
            )}
          </LayoutGroup>
          </>
          )}
        </div>
      </main>

          {/* Sort Stores Modal */}
          <SortStoresModal
            isOpen={isSortingStores}
            onClose={() => setIsSortingStores(false)}
            storeLists={storeLists}
            handleMoveStoreOrder={handleMoveStoreOrder}
          />

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

      <StoreExpandedView
        expandedListId={expandedListId}
        onClose={handleCollapse}
        storeLists={storeLists}
        shoppingItems={shoppingItems}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        isEditingStoreName={isEditingStoreName}
        setIsEditingStoreName={setIsEditingStoreName}
        editStoreNameValue={editStoreNameValue}
        setEditStoreNameValue={setEditStoreNameValue}
        handleUpdateStoreName={handleUpdateStoreName}
        handleStartEditStoreName={handleStartEditStoreName}
        setStoreToDelete={setStoreToDelete}
        handleAddItem={handleAddItem}
        handleToggleItem={handleToggleItem}
        handleDeleteItem={handleDeleteItem}
        handleEditItem={handleEditItem}
        handleClearCompleted={handleClearCompleted}
        handleReorder={handleReorder}
        syncReorderedItems={syncReorderedItems}
        checkboxStyle={checkboxStyle}
        onMoveItems={setStoreToMove}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        editingItem={editingItem}
        onClose={() => setEditingItem(null)}
        editItemName={editItemName}
        setEditItemName={setEditItemName}
        onUpdate={handleUpdateItem}
      />

      {/* Delete Store Confirmation Modal */}
      <DeleteStoreModal
        storeToDelete={storeToDelete}
        onClose={() => setStoreToDelete(null)}
        onConfirm={handleDeleteStore}
      />

      {/* Move Store Modal */}
      <MoveStoreItemsModal
        storeToMove={storeToMove}
        onClose={() => setStoreToMove(null)}
        storeLists={storeLists}
        onMove={handleMoveStoreItems}
      />
    </div>
  );
};