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
  getDocs
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { InventoryItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestore';
import { STORAGE_KEYS, cacheData, getCachedData } from '../utils/cache';
import { useToast } from '../contexts/ToastContext';
import { markItemAsSessionMoved } from '../utils/session';

export const useInventory = (user: User | null) => {
  const { addToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>(() => getCachedData<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS) || []);
  const [dbLocations, setDbLocations] = useState<any[]>(() => getCachedData<any[]>(STORAGE_KEYS.INVENTORY_LOCATIONS) || []);
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

    return () => {
      unsubscribe();
      unsubscribeLocs();
    };
  }, [user]);

  const toggleItemUsed = useCallback(async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        used: !item.used,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/' + item.id);
    }
  }, []);

  const toggleItemLow = useCallback(async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        isLow: !item.isLow,
        updatedAt: Timestamp.now()
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
          movedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      addToast(`${itemsToMove.length} ${itemsToMove.length === 1 ? 'item' : 'items'} moved to ${targetLocation}`, 'move');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/moveLocation');
    }
  }, [items, addToast]);

  const syncReorderedItems = useCallback(async (location: string) => {
    if (!pendingItemsRef.current || isSyncingItemsRef.current) return;
    
    const itemsToSync = [...pendingItemsRef.current].filter(item => item.location === location);
    isSyncingItemsRef.current = true;
    
    try {
      const batch = writeBatch(db);
      itemsToSync.forEach((item) => {
        batch.update(doc(db, 'inventory', item.id), { 
          order: item.order,
          updatedAt: Timestamp.now()
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
            updatedAt: Timestamp.now()
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
    isInitialLoad,
    toggleItemUsed,
    toggleItemLow,
    handleDeleteItem,
    handleDeleteLocation,
    handleMoveLocationItems,
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
    isInitialLoad, 
    toggleItemUsed, 
    toggleItemLow, 
    handleDeleteItem, 
    handleDeleteLocation, 
    handleMoveLocationItems, 
    syncReorderedItems, 
    syncReorderedLocations
  ]);
};
