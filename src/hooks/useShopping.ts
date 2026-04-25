import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { StoreList, ShoppingItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestore';
import { STORAGE_KEYS, cacheData, getCachedData } from '../utils/cache';
import { useToast } from '../contexts/ToastContext';

export const useShopping = (user: User | null) => {
  const { addToast } = useToast();
  const [storeLists, setStoreLists] = useState<StoreList[]>(() => getCachedData<StoreList[]>(STORAGE_KEYS.SHOPPING_LISTS) || []);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => getCachedData<ShoppingItem[]>(STORAGE_KEYS.SHOPPING_ITEMS) || []);
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    const cachedLists = getCachedData<StoreList[]>(STORAGE_KEYS.SHOPPING_LISTS);
    return !(cachedLists && cachedLists.length > 0);
  });

  const isSyncingListsRef = useRef(false);
  const isDraggingListRef = useRef(false);
  const isSyncingItemsRef = useRef(false);
  const isDraggingItemRef = useRef(false);
  const pendingListsRef = useRef<StoreList[] | null>(null);
  const pendingUpdatesRef = useRef<Map<string, ShoppingItem[]>>(new Map());
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const qLists = query(
      collection(db, 'storeLists'),
      where('userId', '==', user.uid)
    );
    const unsubscribeLists = onSnapshot(qLists, (snapshot) => {
      if (!isSyncingListsRef.current && !isDraggingListRef.current) {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreList));
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'storeLists');
      setIsInitialLoad(false);
    });

    const qItems = query(
      collection(db, 'shoppingItems'),
      where('userId', '==', user.uid)
    );
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      if (!isSyncingRef.current && !isDraggingItemRef.current && !isDraggingListRef.current) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
        setShoppingItems(items);
        cacheData(STORAGE_KEYS.SHOPPING_ITEMS, items);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shoppingItems'));

    return () => {
      unsubscribeLists();
      unsubscribeItems();
    };
  }, [user]);

  const syncReorderedItems = useCallback(async (storeListId: string) => {
    if (isSyncingRef.current) {
      return;
    }

    const itemsToUpdate = pendingUpdatesRef.current.get(storeListId);
    if (!itemsToUpdate || itemsToUpdate.length === 0) return;

    isSyncingRef.current = true;
    try {
      const batch = writeBatch(db);
      let hasChanges = false;
      
      itemsToUpdate.forEach((item, index) => {
        // Find existing item to check if order actually changed
        const existing = shoppingItems.find(i => i.id === item.id);
        if (!existing || existing.order !== index || existing.storeListId !== storeListId) {
          batch.update(doc(db, 'shoppingItems', item.id), { 
            order: index,
            storeListId: storeListId,
            updatedAt: Timestamp.now()
          });
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
  }, [shoppingItems]);

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

  const handleDeleteStore = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'storeLists', id));
      const itemsToDelete = shoppingItems.filter(item => item.storeListId === id);
      const batch = writeBatch(db);
      itemsToDelete.forEach(item => {
        batch.delete(doc(db, 'shoppingItems', item.id));
      });
      await batch.commit();
      addToast(`Store and its items deleted`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'storeLists/' + id);
    }
  }, [shoppingItems, addToast]);

  return useMemo(() => ({
    storeLists,
    setStoreLists,
    shoppingItems,
    setShoppingItems,
    isInitialLoad,
    handleToggleItem,
    handleDeleteItem,
    handleDeleteStore,
    syncReorderedItems,
    syncReorderedLists,
    isSyncingListsRef,
    isDraggingListRef,
    isSyncingItemsRef,
    isDraggingItemRef,
    isSyncingRef,
    pendingListsRef,
    pendingUpdatesRef
  }), [
    storeLists, 
    shoppingItems, 
    isInitialLoad, 
    handleToggleItem, 
    handleDeleteItem, 
    handleDeleteStore, 
    syncReorderedItems, 
    syncReorderedLists
  ]);
};
