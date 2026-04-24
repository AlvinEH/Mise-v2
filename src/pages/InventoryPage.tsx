import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls, LayoutGroup } from 'motion/react';
import { Plus, Edit2, Trash2, Package, Apple, Search, Check, X, ChevronDown, ChevronUp, Maximize2, Minimize2, ArrowUpDown, MoveHorizontal, ArrowRightLeft, ArrowUp, ArrowDown, Settings, SlidersHorizontal, ListOrdered } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { PageHeader } from '../components/layout/PageHeader';
import { handleFirestoreError, OperationType } from '../utils/firestore';
import { parseShoppingItem } from '../utils/shoppingItems';
import { InventoryItem, CheckboxStyle } from '../types';
import { InventoryListItem } from '../components/inventory/InventoryListItem';
import { LocationCard } from '../components/inventory/LocationCard';
import { SortLocationsModal } from '../components/inventory/SortLocationsModal';
import { SortOrderModal, InventorySortOrder } from '../components/inventory/SortOrderModal';
import { AddEditItemModal } from '../components/inventory/AddEditItemModal';
import { DeleteLocationModal } from '../components/inventory/DeleteLocationModal';
import { MoveItemsModal } from '../components/inventory/MoveItemsModal';
import { LocationExpandedView } from '../components/inventory/LocationExpandedView';
import { AutoSortSettingsModal } from '../components/inventory/AutoSortSettingsModal';
import { INVENTORY_UNITS } from '../constants/units';
import { markItemAsSessionMoved } from '../utils/session';
import { useToast } from '../contexts/ToastContext';
import { STORAGE_KEYS, cacheData, getCachedData } from '../utils/cache';

interface InventoryPageProps {
  onMenuClick: () => void;
  user: User;
  checkboxStyle: CheckboxStyle;
}

export const InventoryPage = memo(({ onMenuClick, user, checkboxStyle }: InventoryPageProps) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'supplies'>('ingredients');
  const [items, setItems] = useState<InventoryItem[]>(() => getCachedData<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS) || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [dbLocations, setDbLocations] = useState<any[]>(() => getCachedData<any[]>(STORAGE_KEYS.INVENTORY_LOCATIONS) || []);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    location: '',
    purchasedOn: '',
    notes: ''
  });
  const [smartInput, setSmartInput] = useState('');
  const [useSmartInput, setUseSmartInput] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSortingLocations, setIsSortingLocations] = useState(false);
  const [isSortingItems, setIsSortingItems] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [itemSortOrder, setItemSortOrder] = useState<InventorySortOrder>('custom');
  const [isEditingLocationName, setIsEditingLocationName] = useState(false);
  const [isAutoSortModalOpen, setIsAutoSortModalOpen] = useState(false);
  const { addToast } = useToast();
  const [editLocationNameValue, setEditLocationNameValue] = useState('');
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  const [locationToMove, setLocationToMove] = useState<string | null>(null);
  const [storeLists, setStoreLists] = useState<any[]>([]);
  const isSyncingLocsRef = useRef(false);
  const pendingLocsRef = useRef<any[] | null>(null);
  const isSyncingItemsRef = useRef(false);
  const pendingItemsRef = useRef<InventoryItem[] | null>(null);
  const isDraggingLocRef = useRef(false);
  const [isDraggingLoc, setIsDraggingLoc] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    const cachedItems = getCachedData<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS);
    const cachedLocs = getCachedData<any[]>(STORAGE_KEYS.INVENTORY_LOCATIONS);
    return !(cachedItems && cachedItems.length > 0) && !(cachedLocs && cachedLocs.length > 0);
  });
  const locationListRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getCategoryLocations = useCallback((category: 'ingredient' | 'supply') => {
    const fromDb = dbLocations
      .filter(loc => loc.category === category)
      .map(loc => loc.name);
    
    const defaults = category === 'ingredient' 
      ? ['Refrigerator', 'Freezer', 'Pantry'] 
      : ['Closet', 'Washroom'];
      
    const fromItems = items
      .filter(item => item.category === category)
      .map(item => item.location)
      .filter((loc): loc is string => !!loc);

    const allNames = Array.from(new Set([...defaults, ...fromDb, ...fromItems]));
    
    return allNames.sort((a, b) => {
      const locA = dbLocations.find(l => l.name === a && l.category === category);
      const locB = dbLocations.find(l => l.name === b && l.category === category);
      
      const defaultOrderA = defaults.indexOf(a);
      const defaultOrderB = defaults.indexOf(b);
      
      const orderA = locA?.order ?? (defaultOrderA !== -1 ? defaultOrderA : 999);
      const orderB = locB?.order ?? (defaultOrderB !== -1 ? defaultOrderB : 999);
      
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
  }, [dbLocations, items]);

  const ingredientLocations = useMemo(() => getCategoryLocations('ingredient'), [getCategoryLocations]);
  const supplyLocations = useMemo(() => getCategoryLocations('supply'), [getCategoryLocations]);

  const currentLocations = useMemo(() => {
    return activeTab === 'ingredients' ? ingredientLocations : supplyLocations;
  }, [activeTab, ingredientLocations, supplyLocations]);

  const allFilteredItems = useMemo(() => items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }), [items, searchQuery]);

  const ingredientItems = useMemo(() => allFilteredItems.filter(i => i.category === 'ingredient'), [allFilteredItems]);
  const supplyItems = useMemo(() => allFilteredItems.filter(i => i.category === 'supply'), [allFilteredItems]);

  const getDisplayLocations = useCallback((locations: string[], categoryItems: InventoryItem[]) => {
    return locations.filter(location => {
      const locationItems = categoryItems.filter(item => item.location === location);
      const hasMatchingItems = searchQuery === '' || locationItems.length > 0;
      return hasMatchingItems;
    });
  }, [searchQuery]);

  const displayIngredientLocations = useMemo(() => getDisplayLocations(ingredientLocations, ingredientItems), [getDisplayLocations, ingredientLocations, ingredientItems]);
  const displaySupplyLocations = useMemo(() => getDisplayLocations(supplyLocations, supplyItems), [getDisplayLocations, supplyLocations, supplyItems]);

  const currentFilteredItems = useMemo(() => {
    const list = activeTab === 'ingredients' ? ingredientItems : supplyItems;
    
    if (itemSortOrder === 'custom') return list;

    return [...list].sort((a, b) => {
      switch (itemSortOrder) {
        case 'a-z':
          return a.name.localeCompare(b.name);
        case 'z-a':
          return b.name.localeCompare(a.name);
        case 'newest':
          return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        case 'oldest':
          return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
        default:
          return 0;
      }
    });
  }, [activeTab, ingredientItems, supplyItems, itemSortOrder]);

  useEffect(() => {
    if (!user || isInitialLoad) return;

    const migrationKey = `Mise-rules-migrated-v2-${user.uid}`;
    const migrated = localStorage.getItem(migrationKey);

    if (!migrated) {
      const migrateRules = async () => {
        try {
          // Check if user already has custom rules to avoid overwriting or duplicates
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
                createdAt: Timestamp.now()
              });
              added++;
            }
          }

          if (added > 0) {
            await batch.commit();
            console.log(`Migrated ${added} standard supply rules to custom collection.`);
          }
          localStorage.setItem(migrationKey, 'true');
        } catch (error) {
          console.error("Migration failed:", error);
        }
      };

      migrateRules();
    }
  }, [user, isInitialLoad]);

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
        // Sort in memory to handle documents without the 'order' field
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
        // Sort in memory to handle documents without the 'order' field
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
  }, [user]);


  const toggleItemUsed = async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        used: !item.used,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/' + item.id);
    }
  };

  const toggleItemLow = async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        isLow: !item.isLow,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/' + item.id);
    }
  };

  const handleAddLowToShoppingList = async (location: string) => {
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
          createdAt: Timestamp.now(),
          order: 0
        });

        // Toggle low state off since it's now on the shopping list
        batch.update(doc(db, 'inventory', item.id), {
          isLow: false,
          updatedAt: Timestamp.now()
        });
      }
    }

    try {
      await batch.commit();
      addToast(`Low stock items added to shopping list`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/addLowToShoppingList');
    }
  };

  const handleClearUsed = async (location: string) => {
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
  };

  const handleRestockUsed = async (location: string) => {
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
          createdAt: Timestamp.now(),
          order: 0
        });
      }

      // Deselect the item after restocking
      batch.update(doc(db, 'inventory', item.id), {
        used: false,
        updatedAt: Timestamp.now()
      });
    }

    try {
      await batch.commit();
      addToast(`${usedItems.length} items added to shopping list`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/restockUsed');
    }
  };

  const handleClearAndRestockUsed = async (location: string) => {
    const usedItems = items.filter(item => item.location === location && item.used);
    const batch = writeBatch(db);

    for (const item of usedItems) {
      // 1. Queue for Shopping List (Restock logic)
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
          createdAt: Timestamp.now(),
          order: 0
        });
      }

      // 2. Queue for Deletion (Clear logic)
      batch.delete(doc(db, 'inventory', item.id));
    }

    try {
      await batch.commit();
      addToast(`${usedItems.length} items restocked and cleared`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/clearAndRestockUsed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        userId: user.uid,
        updatedAt: Timestamp.now()
      };

      if (editingItem) {
        // When updating, we must explicitly set or clear these fields
        itemData.quantity = finalQuantity || '';
        itemData.unit = finalUnit || '';
        itemData.location = formData.location.trim() || '';
        itemData.purchasedOn = formData.purchasedOn || '';
        itemData.notes = formData.notes.trim() || '';
        
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
      } else {
        // When creating, we only add if they have values
        if (finalQuantity) itemData.quantity = finalQuantity;
        if (finalUnit) itemData.unit = finalUnit;
        if (formData.location.trim()) itemData.location = formData.location.trim();
        if (formData.purchasedOn) itemData.purchasedOn = formData.purchasedOn;
        if (formData.notes.trim()) itemData.notes = formData.notes.trim();

        // Get current max order for this location to append at the end
        const locationItems = items.filter(i => i.location === (formData.location.trim() || 'Uncategorized'));
        const maxOrder = locationItems.length > 0 
          ? Math.max(...locationItems.map(i => i.order ?? 0)) 
          : -1;

        const newDoc = await addDoc(collection(db, 'inventory'), {
          ...itemData,
          order: maxOrder + 1,
          createdAt: Timestamp.now()
        });

        // Scroll to bottom of the card list
        const loc = formData.location.trim() || 'Uncategorized';
        setTimeout(() => {
          const listElement = locationListRefs.current[loc];
          if (listElement) {
            listElement.scrollTo({
              top: listElement.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }

      resetForm();
    } catch (error) {
      console.error('Error handling inventory item:', error);
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'inventory');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    try {
      await deleteDoc(doc(db, 'inventory', item.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory/' + item.id);
    }
  };

  const handleDeleteLocation = async (location: string) => {
    try {
      // 1. Delete items in this location
      const itemsToDelete = items.filter(item => item.location === location);
      const batch = writeBatch(db);
      itemsToDelete.forEach(item => {
        batch.delete(doc(db, 'inventory', item.id));
      });
      
      // 2. Delete the location from inventoryLocations if it exists there
      const dbLoc = dbLocations.find(loc => loc.name === location);
      if (dbLoc) {
        batch.delete(doc(db, 'inventoryLocations', dbLoc.id));
      }
      
      await batch.commit();
      addToast(`Location "${location}" deleted`, 'success');
      
      if (expandedLocation === location) {
        setExpandedLocation(null);
        setIsEditMode(false);
      }
      setLocationToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory/location/' + location);
    }
  };

  const handleMoveLocationItems = async (sourceLocation: string, targetLocation: string) => {
    if (sourceLocation === targetLocation) return;
    
    try {
      const itemsToMove = items.filter(item => item.location === sourceLocation && item.used);
      const batch = writeBatch(db);
      
      // Get max order in target location
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
      setLocationToMove(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/moveLocation');
    }
  };

  // Handle adding item with specific location
  const startAddWithLocation = (location: string) => {
    setUseSmartInput(true);
    setFormData({
      name: '',
      quantity: '',
      unit: '',
      location: location,
      purchasedOn: '',
      notes: ''
    });
    setIsAddingItem(true);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity || '',
      unit: item.unit || '',
      location: item.location || '',
      purchasedOn: item.purchasedOn || '',
      notes: item.notes || ''
    });
    // Initialize smart input with existing item data
    const smartValue = [item.quantity, item.unit, item.name].filter(Boolean).join(' ');
    setSmartInput(smartValue);
    setUseSmartInput(true);
    setIsAddingItem(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      unit: '',
      location: '',
      purchasedOn: '',
      notes: ''
    });
    setSmartInput('');
    setUseSmartInput(true);
    setIsAddingItem(false);
    setEditingItem(null);
  };

  // Reset search when switching tabs
  const handleTabSwitch = (tab: 'ingredients' | 'supplies') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchQuery('');
    setIsAddingLocation(false);
    setExpandedCards({});
    setExpandedLocation(null);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim() || !user) return;

    try {
      const category = activeTab === 'ingredients' ? 'ingredient' : 'supply';
      const maxOrder = dbLocations.filter(l => l.category === category).length > 0 
        ? Math.max(...dbLocations.filter(l => l.category === category).map(l => l.order || 0)) 
        : -1;

      await addDoc(collection(db, 'inventoryLocations'), {
        name: newLocationName.trim(),
        category,
        userId: user.uid,
        order: maxOrder + 1,
        createdAt: Timestamp.now()
      });
      setNewLocationName('');
      setIsAddingLocation(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventoryLocations');
    }
  };

  // Handle expansion functions
  const handleExpand = (location: string) => {
    setExpandedLocation(location);
    window.history.pushState({ expanded: location }, '');
  };

  const handleStartEditLocationName = (name: string) => {
    setEditLocationNameValue(name);
    setIsEditingLocationName(true);
  };

  const handleUpdateLocationName = async () => {
    if (!expandedLocation || !editLocationNameValue.trim() || expandedLocation === editLocationNameValue.trim() || !isEditingLocationName) {
      setIsEditingLocationName(false);
      return;
    }

    setIsEditingLocationName(false); // Set to false immediately to prevent multiple calls
    const newLocation = editLocationNameValue.trim();
    const itemsToUpdate = items.filter(item => item.location === expandedLocation);

    try {
      const batch = writeBatch(db);
      
      // 1. Update all items in this location
      itemsToUpdate.forEach(item => {
        batch.update(doc(db, 'inventory', item.id), {
          location: newLocation,
          updatedAt: Timestamp.now()
        });
      });

      // 2. Update the location document in inventoryLocations if it exists
      const dbLoc = dbLocations.find(loc => loc.name === expandedLocation);
      if (dbLoc) {
        batch.update(doc(db, 'inventoryLocations', dbLoc.id), {
          name: newLocation,
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();

      // Update expandedCards state
      setExpandedCards(prev => {
        const next = { ...prev };
        if (expandedLocation in next) {
          next[newLocation] = next[expandedLocation];
          delete next[expandedLocation];
        }
        return next;
      });

      setExpandedLocation(newLocation);
      setIsEditingLocationName(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory/location/' + expandedLocation);
    }
  };

  const handleCollapse = () => {
    if (expandedLocation) {
      setExpandedLocation(null);
      setIsEditMode(false);
      window.history.back();
    }
  };

  const handleMoveLocationOrder = async (index: number, direction: 'up' | 'down') => {
    const category = activeTab === 'ingredients' ? 'ingredient' : 'supply';
    const categoryLocNames = [...currentLocations];
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categoryLocNames.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = categoryLocNames[index];
    categoryLocNames[index] = categoryLocNames[newIndex];
    categoryLocNames[newIndex] = temp;

    // Update DB
    try {
      const batch = writeBatch(db);
      for (let i = 0; i < categoryLocNames.length; i++) {
        const name = categoryLocNames[i];
        const existing = dbLocations.find(l => l.name === name && l.category === category);
        
        if (existing) {
          if (existing.order !== i) {
            batch.update(doc(db, 'inventoryLocations', existing.id), {
              order: i,
              updatedAt: Timestamp.now()
            });
          }
        } else {
          // Create it so it becomes a "real" location with an order
          const newDocRef = doc(collection(db, 'inventoryLocations'));
          batch.set(newDocRef, {
            name,
            category,
            order: i,
            userId: user?.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }
      await batch.commit();
    } catch (error) {
      console.error('Failed to update location order:', error);
    }
  };

  const toggleCardCollapsed = (location: string) => {
    if (isDraggingLocRef.current) return;
    setExpandedCards(prev => {
      const isCurrentlyExpanded = !!prev[location];
      if (!isCurrentlyExpanded) {
        // Expanding this one, collapse all others
        const newState: Record<string, boolean> = {};
        // All others are collapsed by default (not in newState)
        newState[location] = true; // Expand this one
        return newState;
      } else {
        // Collapsing this one
        const newState = { ...prev };
        delete newState[location];
        return newState;
      }
    });
  };

  useEffect(() => {
    const handlePopState = () => {
      if (expandedLocation) {
        setExpandedLocation(null);
        setIsEditMode(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [expandedLocation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddingLocation) setIsAddingLocation(false);
        else if (isAddingItem) setIsAddingItem(false);
        else if (editingItem) setEditingItem(null);
        else if (locationToDelete) setLocationToDelete(null);
        else if (isEditingLocationName) setIsEditingLocationName(false);
        else if (isEditMode) setIsEditMode(false);
        else if (expandedLocation) setExpandedLocation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddingLocation, isAddingItem, editingItem, locationToDelete, isEditingLocationName, isEditMode, expandedLocation, isSortingLocations]);


  const handleReorderLocations = useCallback((newLocationsNames: string[]) => {
    const category = activeTab === 'ingredients' ? 'ingredient' : 'supply';
    
    // Update DB locations with new order locally
    setDbLocations(prev => {
      const otherLocs = prev.filter(l => l.category !== category);
      
      // Create a map for quick lookup of new order
      const orderMap = new Map(newLocationsNames.map((name, index) => [name, index]));
      
      // Update existing locations and add missing ones
      const updatedLocs = [...prev]
        .filter(l => l.category === category)
        .map(l => {
          if (orderMap.has(l.name)) {
            return { ...l, order: orderMap.get(l.name) };
          }
          return l;
        });
        
      // Add any names that are in newLocationsNames but not in dbLocations
      newLocationsNames.forEach((name, index) => {
        if (!updatedLocs.find(l => l.name === name)) {
          updatedLocs.push({ name, category, userId: user?.uid, order: index });
        }
      });

      const allLocs = [...otherLocs, ...updatedLocs];
      pendingLocsRef.current = allLocs;
      return allLocs;
    });
  }, [activeTab, user?.uid]);

  const syncReorderedLocations = useCallback(async () => {
    if (!pendingLocsRef.current || isSyncingLocsRef.current) return;
    
    const category = activeTab === 'ingredients' ? 'ingredient' : 'supply';
    const locsToSync = [...pendingLocsRef.current];
    isSyncingLocsRef.current = true;
    
    try {
      const batch = writeBatch(db);
      const categoryLocs = locsToSync.filter(l => l.category === category);
      let hasChanges = false;
      
      // We need to make sure we only update locations that actually exist in DB
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
  }, [activeTab]);

  const handleReorderItems = useCallback((location: string, newItems: InventoryItem[]) => {
    setItems(prev => {
      // Keep items from other locations
      const otherItems = prev.filter(item => item.location !== location);
      
      // Update order for items in this location
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        order: index
      }));
      
      const allItems = [...otherItems, ...updatedItems];
      pendingItemsRef.current = allItems;
      return allItems;
    });
  }, []);

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

  // Handle smart input parsing on blur or Enter key
  const handleSmartInputParse = () => {
    const value = smartInput.trim();
    if (value) {
      const parsed = parseShoppingItem(value);
      setFormData(prev => ({
        ...prev,
        name: parsed.name,
        quantity: parsed.amount,
        unit: parsed.unit
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        quantity: '',
        unit: ''
      }));
    }
  };

  // Handle key down for Enter key parsing
  const handleSmartKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSmartInputParse();
    }
  };

  // Toggle between smart input and individual fields
  const toggleInputMode = () => {
    if (useSmartInput) {
      // Switching to individual fields - update smart input with current values
      const smartValue = [formData.quantity, formData.unit, formData.name].filter(Boolean).join(' ');
      setSmartInput(smartValue);
    }
    setUseSmartInput(!useSmartInput);
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <PageHeader title="Inventory" onMenuClick={onMenuClick} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Package size={64} className="mx-auto mb-6 text-m3-on-surface-variant/30" />
            <p className="text-xl font-bold text-m3-on-surface-variant">Please sign in to manage your inventory</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <LayoutGroup>
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
      <PageHeader 
        title="Inventory" 
        onMenuClick={onMenuClick} 
        actions={
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full transition-all ${
                isMenuOpen 
                  ? 'bg-m3-primary text-m3-on-primary shadow-md' 
                  : 'text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10'
              }`}
              title="Options"
            >
              <SlidersHorizontal size={20} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[90]" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 z-[100] w-60 bg-m3-surface rounded-2xl shadow-2xl border border-m3-outline/10 overflow-hidden py-2 px-2 flex flex-col gap-1"
                  >
                    <button
                      onClick={() => {
                        setIsSortingItems(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-3 text-sm font-bold text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary rounded-xl transition-colors text-left"
                    >
                      <ArrowUpDown size={18} className="rotate-90 text-m3-primary/60" />
                      Sort Items
                    </button>
                    <button
                      onClick={() => {
                        setIsSortingLocations(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-3 text-sm font-bold text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary rounded-xl transition-colors text-left"
                    >
                      <ListOrdered size={18} className="text-m3-primary/60" />
                      Reorder Locations
                    </button>
                    <button
                      onClick={() => {
                        setIsAutoSortModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-3 text-sm font-bold text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary rounded-xl transition-colors text-left"
                    >
                      <Settings size={18} className="text-m3-primary/60" />
                      Auto-Sort Rules
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 min-h-0">
        <div className="max-w-7xl mx-auto">
          {/* Search and Tabs */}
          <div className="mb-8 flex flex-col gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 w-full">
              <div className="relative flex-1 group">
                <Search 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/50 transition-colors group-focus-within:text-m3-primary" 
                  size={24} 
                />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'ingredients' ? 'Ingredients' : 'Supplies'}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoCapitalize="words"
                  className="w-full h-14 pl-12 pr-14 bg-m3-surface-container-low border-none rounded-full outline-none focus:ring-2 focus:ring-m3-primary/20 text-base font-bold placeholder:text-m3-on-surface-variant/40 transition-all shadow-sm hover:shadow-md focus:shadow-md"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-m3-on-surface-variant hover:text-m3-on-surface rounded-full hover:bg-m3-surface-variant/20 transition-all"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center w-full">
              <div className="flex items-center gap-1 bg-m3-surface-container-high p-1 rounded-full w-full sm:w-auto">
                <button
                  onClick={() => handleTabSwitch('ingredients')}
                  className={`flex-1 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center min-w-[100px] ${
                    activeTab === 'ingredients'
                      ? 'bg-m3-primary text-m3-on-primary shadow-md'
                      : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                  }`}
                >
                  Ingredients
                </button>
                <button
                  onClick={() => handleTabSwitch('supplies')}
                  className={`flex-1 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center min-w-[100px] ${
                    activeTab === 'supplies'
                      ? 'bg-m3-primary text-m3-on-primary shadow-md'
                      : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                  }`}
                >
                  Supplies
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isAddingLocation && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
                className="bg-m3-surface rounded-[24px] border border-m3-outline/10 shadow-sm overflow-hidden max-w-4xl mx-auto"
              >
                <div className="p-6">
                  <form onSubmit={handleAddLocation} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider px-1">
                        Location Name
                      </label>
                      <input 
                        type="text" 
                        placeholder={`e.g. ${activeTab === 'ingredients' ? 'Wine Cellar, Garage Fridge' : 'Toolbox, Attic'}`}
                        value={newLocationName}
                        onChange={e => setNewLocationName(e.target.value)}
                        autoCapitalize="sentences"
                        className="w-full px-4 py-3 bg-m3-surface-variant/10 border border-m3-outline/10 rounded-xl outline-none focus:border-m3-primary/30 font-bold text-sm transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => setIsAddingLocation(false)}
                        className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={!newLocationName.trim()}
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

          {/* Content Display */}
          <AnimatePresence mode="wait">
            {isInitialLoad ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center py-32"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-m3-primary/20 border-t-m3-primary rounded-full animate-spin" />
                  <p className="text-m3-on-surface-variant/60 font-medium animate-pulse">Loading inventory...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="relative"
              >
                {/* Locations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {(activeTab === 'ingredients' ? displayIngredientLocations : displaySupplyLocations).map((location, index) => (
                    <LocationCard
                      key={`${activeTab}-${location}`}
                      location={location}
                      index={index}
                      locationItems={(activeTab === 'ingredients' ? ingredientItems : supplyItems).filter(item => item.location === location)}
                      toggleCardCollapsed={toggleCardCollapsed}
                      expandedCards={expandedCards}
                      handleExpand={handleExpand}
                      toggleItemUsed={toggleItemUsed}
                      startEdit={startEdit}
                      handleDelete={handleDelete}
                      checkboxStyle={checkboxStyle}
                      handleClearUsed={handleClearUsed}
                      handleRestockUsed={handleRestockUsed}
                      handleClearAndRestockUsed={handleClearAndRestockUsed}
                      startAddWithLocation={startAddWithLocation}
                      isDraggingLocRef={isDraggingLocRef}
                      onReorderItems={handleReorderItems}
                      onReorderEnd={syncReorderedItems}
                      onMoveItems={setLocationToMove}
                      onListRef={(loc, el) => {
                        locationListRefs.current[loc] = el;
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sort Locations Modal */}
          <SortLocationsModal
            isOpen={isSortingLocations}
            onClose={() => setIsSortingLocations(false)}
            currentLocations={currentLocations}
            handleMoveLocationOrder={handleMoveLocationOrder}
          />

          {/* Sort Order Modal */}
          <SortOrderModal
            isOpen={isSortingItems}
            onClose={() => setIsSortingItems(false)}
            currentSortOrder={itemSortOrder}
            onSortOrderChange={setItemSortOrder}
          />

          {/* Add/Edit Modal */}
          <AddEditItemModal
            isOpen={isAddingItem}
            onClose={resetForm}
            editingItem={editingItem}
            activeTab={activeTab}
            formData={formData}
            setFormData={setFormData}
            smartInput={smartInput}
            setSmartInput={setSmartInput}
            useSmartInput={useSmartInput}
            toggleInputMode={toggleInputMode}
            handleSmartInputParse={handleSmartInputParse}
            handleSmartKeyDown={handleSmartKeyDown}
            handleSubmit={handleSubmit}
            currentLocations={currentLocations}
          />
        </div>
      </main>

      {/* Full-Page Expansion Modal */}
      <LocationExpandedView
        location={expandedLocation}
        onClose={handleCollapse}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        isEditingLocationName={isEditingLocationName}
        setIsEditingLocationName={setIsEditingLocationName}
        editLocationNameValue={editLocationNameValue}
        setEditLocationNameValue={setEditLocationNameValue}
        handleUpdateLocationName={handleUpdateLocationName}
        handleStartEditLocationName={handleStartEditLocationName}
        setLocationToDelete={setLocationToDelete}
        setLocationToMove={setLocationToMove}
        filteredItems={currentFilteredItems}
        toggleItemUsed={toggleItemUsed}
        startEdit={startEdit}
        handleDelete={handleDelete}
        handleClearUsed={handleClearUsed}
        handleRestockUsed={handleRestockUsed}
        handleClearAndRestockUsed={handleClearAndRestockUsed}
        handleReorderItems={handleReorderItems}
        syncReorderedItems={syncReorderedItems}
        startAddWithLocation={startAddWithLocation}
        checkboxStyle={checkboxStyle}
      />

      {/* Delete Location Confirmation Modal */}
      <DeleteLocationModal
        locationName={locationToDelete}
        onClose={() => setLocationToDelete(null)}
        onConfirm={handleDeleteLocation}
      />

      {/* Move Location Modal */}
      <MoveItemsModal
        sourceLocation={locationToMove}
        onClose={() => setLocationToMove(null)}
        availableLocations={currentLocations}
        onMove={handleMoveLocationItems}
      />

      {/* Floating Action Button */}
      <AnimatePresence>
        {!expandedLocation && !Object.values(expandedCards).some(v => v === true) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-40 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
          >
            <motion.button 
              onClick={() => setIsAddingLocation(!isAddingLocation)}
              animate={{ 
                rotate: isAddingLocation ? 45 : 0,
                backgroundColor: isAddingLocation ? "var(--m3-secondary)" : "var(--m3-primary-container)",
                color: isAddingLocation ? "var(--m3-on-secondary)" : "var(--m3-on-primary-container)"
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
              title="Add Location"
            >
              <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.08] transition-opacity" />
              <div className="relative z-10">
                <Plus size={24} strokeWidth={2} />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      <AutoSortSettingsModal
        isOpen={isAutoSortModalOpen}
        onClose={() => setIsAutoSortModalOpen(false)}
        user={user}
      />
    </LayoutGroup>
  );
});