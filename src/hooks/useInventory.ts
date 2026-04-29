import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  writeBatch,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { InventoryItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestore';
import { parseShoppingItem } from '../utils/shoppingItems';
import { STORAGE_KEYS, cacheData, getCachedData } from '../utils/cache';
import { useToast } from '../contexts/ToastContext';
import { markItemAsSessionMoved } from '../utils/session';

export const useInventory = (user: User | null) => {
  const { addToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>(() => getCachedData<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS) || []);
  const [dbLocations, setDbLocations] = useState<any[]>(() => getCachedData<any[]>(STORAGE_KEYS.INVENTORY_LOCATIONS) || []);
  const [storeLists, setStoreLists] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    const cachedItems = getCachedData<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS);
    const cachedLocs = getCachedData<any[]>(STORAGE_KEYS.INVENTORY_LOCATIONS);
    return !(cachedItems && cachedItems.length > 0) && !(cachedLocs && cachedLocs.length > 0);
  });

  const isSyncingItemsRef = useRef(false);
  const isSyncingLocsRef = useRef(false);
  const isDraggingLocRef = useRef(false);
  const pendingLocsRef = useRef<any[] | null>(null);
  const pendingItemsRef = useRef<InventoryItem[] | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isDraggingLocRef.current && !isSyncingItemsRef.current) {
        const inventoryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as InventoryItem));
        
        const sortedItems = inventoryData.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.id.localeCompare(b.id);
        });
        
        setItems(sortedItems);
        cacheData(STORAGE_KEYS.INVENTORY_ITEMS, sortedItems);
        setIsInitialLoad(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    const qLocs = query(
      collection(db, 'inventoryLocations'),
      where('userId', '==', user.uid)
    );

    const unsubscribeLocs = onSnapshot(qLocs, (snapshot) => {
      if (!isSyncingLocsRef.current && !isDraggingLocRef.current) {
        const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const sortedLocs = locs.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        setDbLocations(sortedLocs);
        cacheData(STORAGE_KEYS.INVENTORY_LOCATIONS, sortedLocs);
        setIsInitialLoad(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventoryLocations');
    });

    const qStores = query(
      collection(db, 'storeLists'),
      where('userId', '==', user.uid)
    );

    const unsubscribeStores = onSnapshot(qStores, (snapshot) => {
      const stores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setStoreLists(stores.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'storeLists');
    });

    return () => {
      unsubscribe();
      unsubscribeLocs();
      unsubscribeStores();
    };
  }, [user?.uid]);

  // Migrate default auto-sort rules for new users
  useEffect(() => {
    if (!user || isInitialLoad) return;

    const migrationKey = `Mise-rules-migrated-v2-${user.uid}`;
    const migrated = localStorage.getItem(migrationKey);

    if (!migrated) {
      const migrateRules = async () => {
        try {
          const rulesRef = collection(db, 'inventoryAutoSortRules');
          const q = query(rulesRef, where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          const existingKeywords = snapshot.docs.map(doc => doc.data().keyword.toLowerCase());

          const batch = writeBatch(db);
          const rulesToSeed = [
            { keyword: 'dish soap', location: 'Under Sink', category: 'supply' },
            { keyword: 'trash bag', location: 'Under Sink', category: 'supply' },
            { keyword: 'recycle bag', location: 'Under Sink', category: 'supply' },
            { keyword: 'paper towel', location: 'Closet', category: 'supply' },
            { keyword: 'toilet paper', location: 'Closet', category: 'supply' },
            { keyword: 'cleaning supply', location: 'Closet', category: 'supply' },
            { keyword: 'battery', location: 'Closet', category: 'supply' },
            { keyword: 'snack', location: 'Pantry', category: 'ingredient' },
            { keyword: 'detergent', location: 'Laundry Room', category: 'supply' },
            { keyword: 'laundry', location: 'Laundry Room', category: 'supply' },
            { keyword: 'bags', location: 'Pantry', category: 'supply' }
          ];

          let added = 0;
          for (const rule of rulesToSeed) {
            if (!existingKeywords.includes(rule.keyword)) {
              const newRuleRef = doc(collection(db, 'inventoryAutoSortRules'));
              batch.set(newRuleRef, {
                ...rule,
                userId: user.uid,
                createdAt: serverTimestamp()
              });
              added++;
            }
          }

          if (added > 0) {
            await batch.commit();
          }
          localStorage.setItem(migrationKey, 'true');
        } catch (error) {
          console.error("Migration failed:", error);
        }
      };
      migrateRules();
    }
  }, [user, isInitialLoad]);

  const toggleItemUsed = useCallback(async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        used: !item.used,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/' + item.id);
    }
  }, []);

  const toggleItemLow = useCallback(async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        isLow: !item.isLow,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/' + item.id);
    }
  }, []);

  const handleDeleteItem = useCallback(async (item: InventoryItem) => {
    try {
      await deleteDoc(doc(db, 'inventory', item.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory/' + item.id);
    }
  }, []);

  const handleAddLocation = useCallback(async (name: string, category: 'ingredient' | 'supply') => {
    if (!user) return;
    try {
      const maxOrder = dbLocations.filter(l => l.category === category).length > 0 
        ? Math.max(...dbLocations.filter(l => l.category === category).map(l => l.order || 0)) 
        : -1;

      await addDoc(collection(db, 'inventoryLocations'), {
        name: name.trim(),
        category,
        userId: user.uid,
        order: maxOrder + 1,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventoryLocations');
    }
  }, [user, dbLocations]);

  const handleDeleteLocation = useCallback(async (location: string) => {
    try {
      const itemsToDelete = items.filter(item => item.location === location);
      const batch = writeBatch(db);
      itemsToDelete.forEach(item => {
        batch.delete(doc(db, 'inventory', item.id));
      });
      
      const dbLoc = dbLocations.find(loc => loc.name === location);
      if (dbLoc) {
        batch.delete(doc(db, 'inventoryLocations', dbLoc.id));
      }
      
      await batch.commit();
      addToast(`Location "${location}" deleted`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory/location/' + location);
    }
  }, [items, dbLocations, addToast]);

  const handleUpdateLocationName = useCallback(async (oldName: string, newName: string) => {
    const itemsToUpdate = items.filter(item => item.location === oldName);

    try {
      const batch = writeBatch(db);
      itemsToUpdate.forEach(item => {
        batch.update(doc(db, 'inventory', item.id), {
          location: newName,
          updatedAt: serverTimestamp()
        });
      });

      const dbLoc = dbLocations.find(loc => loc.name === oldName);
      if (dbLoc) {
        batch.update(doc(db, 'inventoryLocations', dbLoc.id), {
          name: newName,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/location/' + oldName);
    }
  }, [items, dbLocations]);

  const handleMoveLocationItems = useCallback(async (sourceLocation: string, targetLocation: string) => {
    if (sourceLocation === targetLocation) return;
    
    try {
      const itemsToMove = items.filter(item => item.location === sourceLocation && item.used);
      const batch = writeBatch(db);
      
      const targetItems = items.filter(item => item.location === targetLocation);
      let maxOrder = targetItems.length > 0 
        ? Math.max(...targetItems.map(i => i.order ?? 0)) 
        : -1;

      itemsToMove.forEach((item) => {
        maxOrder++;
        markItemAsSessionMoved(item.id);
        batch.update(doc(db, 'inventory', item.id), {
          location: targetLocation,
          order: maxOrder,
          used: false,
          movedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      addToast(`${itemsToMove.length} ${itemsToMove.length === 1 ? 'item' : 'items'} moved to ${targetLocation}`, 'move');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/moveLocation');
    }
  }, [items, addToast]);

  const handleClearUsed = useCallback(async (location: string) => {
    const usedItems = items.filter(item => item.location === location && item.used);
    const batch = writeBatch(db);

    for (const item of usedItems) {
      batch.delete(doc(db, 'inventory', item.id));
    }

    try {
      await batch.commit();
      addToast(`${usedItems.length} items cleared from ${location}`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory/clearUsed');
    }
  }, [items, addToast]);

  const handleRestockUsed = useCallback(async (location: string) => {
    const usedItems = items.filter(item => item.location === location && item.used);
    const batch = writeBatch(db);

    for (const item of usedItems) {
      let targetStoreId = '';
      const boughtFromMatch = item.notes?.match(/Bought from (.+)/);
      if (boughtFromMatch) {
        const storeName = boughtFromMatch[1].trim();
        const store = storeLists.find(s => s.name.toLowerCase() === storeName.toLowerCase());
        if (store) targetStoreId = store.id;
      }

      if (!targetStoreId && storeLists.length > 0) {
        targetStoreId = storeLists[0].id;
      }

      if (targetStoreId) {
        const shoppingItemRef = doc(collection(db, 'shoppingItems'));
        batch.set(shoppingItemRef, {
          name: item.name,
          amount: item.quantity || '',
          unit: item.unit || '',
          storeListId: targetStoreId,
          completed: false,
          userId: user?.uid,
          createdAt: serverTimestamp(),
          order: 0
        });
      }

      batch.update(doc(db, 'inventory', item.id), {
        used: false,
        updatedAt: serverTimestamp()
      });
    }

    try {
      await batch.commit();
      addToast(`${usedItems.length} items added to shopping list`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/restockUsed');
    }
  }, [items, storeLists, user?.uid, addToast]);

  const handleClearAndRestockUsed = useCallback(async (location: string) => {
    const usedItems = items.filter(item => item.location === location && item.used);
    const batch = writeBatch(db);

    for (const item of usedItems) {
      let targetStoreId = '';
      const boughtFromMatch = item.notes?.match(/Bought from (.+)/);
      if (boughtFromMatch) {
        const storeName = boughtFromMatch[1].trim();
        const store = storeLists.find(s => s.name.toLowerCase() === storeName.toLowerCase());
        if (store) targetStoreId = store.id;
      }

      if (!targetStoreId && storeLists.length > 0) {
        targetStoreId = storeLists[0].id;
      }

      if (targetStoreId) {
        const shoppingItemRef = doc(collection(db, 'shoppingItems'));
        batch.set(shoppingItemRef, {
          name: item.name,
          amount: item.quantity || '',
          unit: item.unit || '',
          storeListId: targetStoreId,
          completed: false,
          userId: user?.uid,
          createdAt: serverTimestamp(),
          order: 0
        });
      }

      batch.delete(doc(db, 'inventory', item.id));
    }

    try {
      await batch.commit();
      addToast(`${usedItems.length} items restocked and cleared`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/clearAndRestockUsed');
    }
  }, [items, storeLists, user?.uid, addToast]);

  const handleAddLowToShoppingList = useCallback(async (location: string) => {
    const lowItems = items.filter(item => item.location === location && item.isLow && !item.used);
    if (lowItems.length === 0) return;

    const batch = writeBatch(db);

    for (const item of lowItems) {
      let targetStoreId = '';
      const boughtFromMatch = item.notes?.match(/Bought from (.+)/);
      if (boughtFromMatch) {
        const storeName = boughtFromMatch[1].trim();
        const store = storeLists.find(s => s.name.toLowerCase() === storeName.toLowerCase());
        if (store) targetStoreId = store.id;
      }

      if (!targetStoreId && storeLists.length > 0) {
        targetStoreId = storeLists[0].id;
      }

      if (targetStoreId) {
        const shoppingItemRef = doc(collection(db, 'shoppingItems'));
        batch.set(shoppingItemRef, {
          name: item.name,
          amount: item.quantity || '',
          unit: item.unit || '',
          storeListId: targetStoreId,
          completed: false,
          userId: user?.uid,
          createdAt: serverTimestamp(),
          order: 0
        });

        batch.update(doc(db, 'inventory', item.id), {
          isLow: false,
          updatedAt: serverTimestamp()
        });
      }
    }

    try {
      await batch.commit();
      addToast(`Low stock items added to shopping list`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/addLowToShoppingList');
    }
  }, [items, storeLists, user?.uid, addToast]);

  const handleSubmit = useCallback(async (
    formData: any, 
    useSmartInput: boolean, 
    smartInput: string, 
    editingItem: InventoryItem | null,
    activeTab: 'ingredients' | 'supplies',
    resetForm: () => void
  ) => {
    if (!user) return;

    let finalName = formData.name.trim();
    let finalQuantity = formData.quantity.trim();
    let finalUnit = formData.unit.trim();

    if (useSmartInput) {
      if (!smartInput.trim()) return;
      const parsed = parseShoppingItem(smartInput.trim());
      finalName = parsed.name;
      finalQuantity = parsed.amount;
      finalUnit = parsed.unit;
    }

    if (!finalName) return;

    try {
      const itemData: any = {
        name: finalName,
        category: activeTab === 'ingredients' ? 'ingredient' : 'supply',
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        itemData.quantity = finalQuantity || '';
        itemData.unit = finalUnit || '';
        itemData.location = formData.location.trim() || '';
        itemData.purchasedOn = formData.purchasedOn || '';
        itemData.notes = formData.notes.trim() || '';
        
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
      } else {
        itemData.userId = user.uid;
        if (finalQuantity) itemData.quantity = finalQuantity;
        if (finalUnit) itemData.unit = finalUnit;
        if (formData.location.trim()) itemData.location = formData.location.trim();
        if (formData.purchasedOn) itemData.purchasedOn = formData.purchasedOn;
        if (formData.notes.trim()) itemData.notes = formData.notes.trim();

        const locationItems = items.filter(i => i.location === (formData.location.trim() || 'Uncategorized'));
        const maxOrder = locationItems.length > 0 
          ? Math.max(...locationItems.map(i => i.order ?? 0)) 
          : -1;

        await addDoc(collection(db, 'inventory'), {
          ...itemData,
          order: maxOrder + 1,
          createdAt: serverTimestamp()
        });
      }

      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'inventory');
    }
  }, [user, items]);

  const syncReorderedItems = useCallback(async (location: string) => {
    if (!pendingItemsRef.current || isSyncingItemsRef.current) return;
    
    const itemsToSync = [...pendingItemsRef.current].filter(item => item.location === location);
    isSyncingItemsRef.current = true;
    
    try {
      const batch = writeBatch(db);
      itemsToSync.forEach((item) => {
        batch.update(doc(db, 'inventory', item.id), { 
          order: item.order,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to sync items reorder:', error);
    } finally {
      isSyncingItemsRef.current = false;
      pendingItemsRef.current = null;
    }
  }, []);

  const syncReorderedLocations = useCallback(async (category: 'ingredient' | 'supply') => {
    if (!pendingLocsRef.current || isSyncingLocsRef.current) return;
    
    const locsToSync = [...pendingLocsRef.current];
    isSyncingLocsRef.current = true;
    
    try {
      const batch = writeBatch(db);
      const categoryLocs = locsToSync.filter(l => l.category === category);
      let hasChanges = false;
      
      categoryLocs.forEach((loc) => {
        if (loc.id) {
          batch.update(doc(db, 'inventoryLocations', loc.id), { 
            order: loc.order,
            updatedAt: serverTimestamp()
          });
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to sync locations reorder:', error);
    } finally {
      isSyncingLocsRef.current = false;
      pendingLocsRef.current = null;
    }
  }, []);

  return useMemo(() => ({
    items,
    setItems,
    dbLocations,
    setDbLocations,
    storeLists,
    isInitialLoad,
    toggleItemUsed,
    toggleItemLow,
    handleDeleteItem,
    handleDeleteLocation,
    handleMoveLocationItems,
    handleAddLocation,
    handleUpdateLocationName,
    handleClearUsed,
    handleRestockUsed,
    handleClearAndRestockUsed,
    handleAddLowToShoppingList,
    handleSubmit,
    syncReorderedItems,
    syncReorderedLocations,
    isDraggingLocRef,
    isSyncingItemsRef,
    isSyncingLocsRef,
    pendingLocsRef,
    pendingItemsRef
  }), [
    items, 
    dbLocations, 
    storeLists,
    isInitialLoad, 
    toggleItemUsed, 
    toggleItemLow, 
    handleDeleteItem, 
    handleDeleteLocation, 
    handleMoveLocationItems, 
    handleAddLocation,
    handleUpdateLocationName,
    handleClearUsed,
    handleRestockUsed,
    handleClearAndRestockUsed,
    handleAddLowToShoppingList,
    handleSubmit,
    syncReorderedItems,
    syncReorderedLocations
  ]);
};
