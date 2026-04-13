import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Edit2, Trash2, Package, Apple, Search, Check, X, ChevronDown, ChevronUp, Maximize2, Minimize2, ArrowUpDown, MoveHorizontal, ArrowRightLeft } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { PageHeader } from '../components/layout/PageHeader';
import { handleFirestoreError, OperationType } from '../utils/firestore';
import { parseShoppingItem } from '../utils/shoppingItems';
import { CheckboxStyle } from '../types';

interface InventoryPageProps {
  onMenuClick: () => void;
  checkboxStyle: CheckboxStyle;
}

interface InventoryItem {
  id: string;
  name: string;
  category: 'ingredient' | 'supply';
  quantity?: string;
  unit?: string;
  location?: string;
  purchasedOn?: string;
  notes?: string;
  used?: boolean;
  userId: string;
  createdAt: any;
  updatedAt: any;
  movedAt?: any;
  order?: number;
}

const InventoryListItem = memo(({ 
  item, 
  onToggleUsed, 
  onEdit, 
  onDelete, 
  isExpandedView = false,
  isEditMode = false,
  className = "",
  checkboxStyle = "square",
  isDraggingLocRef,
  onReorderEnd
}: { 
  item: InventoryItem; 
  onToggleUsed: (item: InventoryItem) => void; 
  onEdit: (item: InventoryItem) => void; 
  onDelete: (item: InventoryItem) => void;
  isExpandedView?: boolean;
  isEditMode?: boolean;
  className?: string;
  checkboxStyle?: CheckboxStyle;
  isDraggingLocRef?: React.MutableRefObject<boolean>;
  onReorderEnd?: () => void;
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onEdit(item);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingLocRef?.current || isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onToggleUsed(item);
  };

  const isRecentlyMoved = item.movedAt && (Date.now() - (typeof item.movedAt.toMillis === 'function' ? item.movedAt.toMillis() : new Date(item.movedAt).getTime())) < 24 * 60 * 60 * 1000;

  return (
    <Reorder.Item
      layout
      value={item}
      id={item.id}
      dragMomentum={false}
      dragElastic={0.05}
      onDragStart={() => {
        if (isDraggingLocRef) isDraggingLocRef.current = true;
      }}
      onDragEnd={() => {
        if (isDraggingLocRef) {
          setTimeout(() => {
            isDraggingLocRef.current = false;
          }, 100);
        }
        if (onReorderEnd) onReorderEnd();
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2 group select-none ${item.used ? 'opacity-50' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      style={{ touchAction: 'none' }}
    >
      <button
        onClick={handleClick}
        className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-all ${
          checkboxStyle === 'circle' ? 'rounded-full' : 'rounded'
        } ${
          item.used 
            ? 'bg-m3-primary border-m3-primary text-m3-on-primary' 
            : 'border-m3-outline hover:border-m3-primary'
        }`}
      >
        {item.used && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center gap-2">
          <h4 className={`font-bold text-base text-m3-on-surface truncate leading-tight ${item.used ? 'line-through' : ''}`}>
            {item.name}
          </h4>
          {isRecentlyMoved && (
            <span title="Recently moved">
              <ArrowRightLeft size={12} className="text-m3-primary shrink-0" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant/60 font-medium">
          {item.quantity && (
            <span>
              {item.quantity} {item.unit}
            </span>
          )}
          {item.purchasedOn && (
            <span>
              • {new Date(item.purchasedOn).toLocaleDateString()}
            </span>
          )}
          {item.notes && (
            <span className="italic truncate max-w-[100px]">
              • {item.notes}
            </span>
          )}
        </div>
      </div>
      <div className={`flex items-center gap-2 transition-opacity ${isExpandedView ? (isEditMode ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-60 group-hover:opacity-100'}`}>
        <button
          onClick={() => onDelete(item)}
          className={`p-2 rounded-md transition-colors ${isExpandedView ? 'text-m3-on-surface-variant hover:text-red-600 hover:bg-red-50' : 'text-m3-on-surface-variant/40 hover:text-red-600 hover:bg-red-50'}`}
          title="Delete item"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </Reorder.Item>
  );
});

const ReorderableLocationCard = memo(({
  location,
  index,
  locationItems,
  toggleCardCollapsed,
  expandedCards,
  handleExpand,
  setIsDraggingLoc,
  syncReorderedLocations,
  toggleItemUsed,
  startEdit,
  handleDelete,
  checkboxStyle,
  handleClearUsed,
  startAddWithLocation,
  isDraggingLocRef,
  onReorderItems,
  onReorderEnd,
  onMoveItems
}: {
  location: string;
  index: number;
  locationItems: InventoryItem[];
  toggleCardCollapsed: (loc: string) => void;
  expandedCards: Record<string, boolean>;
  handleExpand: (loc: string) => void;
  setIsDraggingLoc: (isDragging: boolean) => void;
  syncReorderedLocations: () => void;
  toggleItemUsed: (item: InventoryItem) => void;
  startEdit: (item: InventoryItem) => void;
  handleDelete: (item: InventoryItem) => void;
  checkboxStyle: CheckboxStyle;
  handleClearUsed: (loc: string) => void;
  startAddWithLocation: (loc: string) => void;
  isDraggingLocRef: React.MutableRefObject<boolean>;
  onReorderItems: (location: string, newItems: InventoryItem[]) => void;
  onReorderEnd: (location: string) => void;
  onMoveItems: (location: string) => void;
}) => {
  return (
    <Reorder.Item
      key={location}
      value={location}
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      onDragStart={() => {
        setIsDraggingLoc(true);
        isDraggingLocRef.current = true;
      }}
      onDragEnd={() => {
        setIsDraggingLoc(false);
        // Delay resetting the ref so click handlers can check it
        setTimeout(() => {
          isDraggingLocRef.current = false;
        }, 100);
        syncReorderedLocations();
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout="position"
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-sm flex flex-col h-fit relative group"
      style={{ touchAction: 'none' }}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 hover:bg-m3-surface-variant/10 -m-2 p-2 rounded-xl transition-colors"
          onClick={() => toggleCardCollapsed(location)}
        >
          <div>
            <h3 className="text-xl font-black text-m3-on-surface leading-tight">{location}</h3>
            <span className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider mt-[-2px] block">
              {locationItems.length} items
            </span>
          </div>
          <div className="ml-auto text-m3-on-surface-variant/40">
            {expandedCards[location] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
        <div className="flex items-center ml-2">
          <button
            onClick={() => {
              if (isDraggingLocRef.current) return;
              handleExpand(location);
            }}
            className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
            title="Full Screen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
      
      {/* Expandable Content Section */}
      <AnimatePresence initial={false}>
        {expandedCards[location] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col overflow-hidden"
            style={{ 
              maxHeight: locationItems.length === 0 ? '280px' : Math.min(10, locationItems.length) * 45 + 120 + 'px'
            }}
          >
            <div className={`space-y-0.5 px-6 pb-2 ${locationItems.length > 10 ? 'overflow-y-auto' : ''}`}>
              <AnimatePresence>
                {locationItems.some(i => i.used) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center px-2 overflow-hidden mb-1"
                  >
                    <button
                      onClick={() => onMoveItems(location)}
                      className="text-[10px] font-black text-m3-primary hover:underline transition-all uppercase tracking-wider py-1"
                    >
                      Move to Location
                    </button>
                    <button
                      onClick={() => handleClearUsed(location)}
                      className="text-[10px] font-black text-m3-error hover:underline transition-all uppercase tracking-wider py-1"
                    >
                      Clear Used
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {locationItems.length > 0 ? (
                <Reorder.Group 
                  axis="y"
                  values={locationItems}
                  onReorder={(newItems) => onReorderItems(location, newItems)}
                  className="space-y-0.5"
                >
                  <AnimatePresence>
                    {locationItems.map((item) => (
                      <InventoryListItem
                        key={item.id}
                        item={item}
                        onToggleUsed={toggleItemUsed}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        isExpandedView={false}
                        checkboxStyle={checkboxStyle}
                        className="py-1 px-2 hover:bg-m3-surface-variant/10 rounded-xl"
                        isDraggingLocRef={isDraggingLocRef}
                        onReorderEnd={() => onReorderEnd(location)}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-m3-on-surface-variant/60 text-base font-medium">
                    No items in {location.toLowerCase()}
                  </p>
                </div>
                )}
            </div>
            
            {/* Footer Section - Part of collapsible content */}
            <div className="sticky bottom-0 bg-m3-surface-container-low px-6 py-4 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => startAddWithLocation(location)}
                className="w-full p-2 bg-m3-primary/10 text-m3-primary rounded-xl hover:bg-m3-primary/20 transition-all flex items-center justify-center gap-2 text-base font-medium"
              >
                <Plus size={18} />
                Add to {location}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
});

export const InventoryPage = memo(({ onMenuClick, checkboxStyle }: InventoryPageProps) => {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'supplies'>('ingredients');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [dbLocations, setDbLocations] = useState<any[]>([]);
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
  const [isEditingLocationName, setIsEditingLocationName] = useState(false);
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

  // Common units for ingredients and supplies
  const commonUnits = {
    ingredients: ['cups', 'tbsp', 'tsp', 'oz', 'lbs', 'g', 'kg', 'ml', 'L', 'pieces', 'cans', 'bottles', 'bags', 'Racks'],
    supplies: ['pieces', 'rolls', 'boxes', 'packs', 'sets', 'bottles', 'tubes', 'sheets']
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', user.uid),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isDraggingLocRef.current && !isSyncingItemsRef.current) {
        const inventoryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as InventoryItem));
        // Sort in memory to handle documents without the 'order' field
        setItems(inventoryData.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    const qLocs = query(
      collection(db, 'inventoryLocations'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );

    const unsubscribeLocs = onSnapshot(qLocs, (snapshot) => {
      if (!isSyncingLocsRef.current && !isDraggingLocRef.current) {
        const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        // Sort in memory to handle documents without the 'order' field
        setDbLocations(locs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventoryLocations');
    });

    const qStores = query(
      collection(db, 'storeLists'),
      where('userId', '==', user.uid),
      orderBy('name')
    );

    const unsubscribeStores = onSnapshot(qStores, (snapshot) => {
      setStoreLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'storeLists');
    });

    return () => {
      unsubscribe();
      unsubscribeLocs();
      unsubscribeStores();
    };
  }, [user]);

  const currentLocations = useMemo(() => {
    const category = activeTab === 'ingredients' ? 'ingredient' : 'supply';
    const fromDb = dbLocations
      .filter(loc => loc.category === category)
      .map(loc => loc.name);
    
    const defaults = activeTab === 'ingredients' 
      ? ['Freezer', 'Refrigerator', 'Pantry'] 
      : ['Closet', 'Washroom'];
      
    // Also include any locations that exist in items but not in DB/defaults
    const fromItems = items
      .filter(item => item.category === (activeTab === 'ingredients' ? 'ingredient' : 'supply'))
      .map(item => item.location)
      .filter((loc): loc is string => !!loc);

    const allNames = Array.from(new Set([...defaults, ...fromDb, ...fromItems]));
    
    return allNames.sort((a, b) => {
      const locA = dbLocations.find(l => l.name === a && l.category === category);
      const locB = dbLocations.find(l => l.name === b && l.category === category);
      
      // If order is the same or missing, fallback to alphabetical
      const orderA = locA?.order ?? 999;
      const orderB = locB?.order ?? 999;
      
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
  }, [dbLocations, activeTab, items]);

  const filteredItems = useMemo(() => items.filter(item => {
    const matchesTab = item.category === (activeTab === 'ingredients' ? 'ingredient' : 'supply');
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  }), [items, activeTab, searchQuery]);

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

  const handleClearUsed = async (location: string) => {
    const usedItems = items.filter(item => item.location === location && item.used);
    const batch = writeBatch(db);

    for (const item of usedItems) {
      // 1. Determine the appropriate shopping list
      let targetStoreId = '';
      
      // Try to get store name from notes: "Bought from Store Name"
      const boughtFromMatch = item.notes?.match(/Bought from (.+)/);
      if (boughtFromMatch) {
        const storeName = boughtFromMatch[1].trim();
        const store = storeLists.find(s => s.name.toLowerCase() === storeName.toLowerCase());
        if (store) {
          targetStoreId = store.id;
        }
      }

      // If no store found from notes, use the first available store
      if (!targetStoreId && storeLists.length > 0) {
        targetStoreId = storeLists[0].id;
      }

      // 2. Add to shopping list if a store was found
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
          order: 0 // Will be at the top
        });
      }

      // 3. Delete from inventory
      batch.delete(doc(db, 'inventory', item.id));
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory/clearUsed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !user) return;

    try {
      const itemData: any = {
        name: formData.name.trim(),
        category: activeTab === 'ingredients' ? 'ingredient' : 'supply',
        userId: user.uid,
        updatedAt: Timestamp.now()
      };

      // Only add optional fields if they have values
      if (formData.quantity.trim()) {
        itemData.quantity = formData.quantity.trim();
      }
      if (formData.unit.trim()) {
        itemData.unit = formData.unit.trim();
      }
      if (formData.location.trim()) {
        itemData.location = formData.location.trim();
      }
      if (formData.purchasedOn) {
        itemData.purchasedOn = formData.purchasedOn;
      }
      if (formData.notes.trim()) {
        itemData.notes = formData.notes.trim();
      }

      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
      } else {
        // Get current max order for this location to append at the end
        const locationItems = items.filter(i => i.location === (formData.location.trim() || 'Uncategorized'));
        const maxOrder = locationItems.length > 0 
          ? Math.max(...locationItems.map(i => i.order ?? 0)) 
          : -1;

        await addDoc(collection(db, 'inventory'), {
          ...itemData,
          order: maxOrder + 1,
          createdAt: Timestamp.now()
        });
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
        batch.update(doc(db, 'inventory', item.id), {
          location: targetLocation,
          order: maxOrder,
          used: false,
          movedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
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
    setActiveTab(tab);
    setSearchQuery('');
    setIsAddingLocation(false);
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
  }, [isAddingLocation, isAddingItem, editingItem, locationToDelete, isEditingLocationName, isEditMode, expandedLocation]);

  const displayLocations = useMemo(() => {
    // If we're dragging, we want to keep the order stable to avoid fighting with Reorder.Group
    // However, Reorder.Group already handles the local order.
    // The main thing is to avoid re-sorting or re-filtering if it's not necessary.
    return currentLocations.filter(location => {
      const locationItems = filteredItems.filter(item => item.location === location);
      const hasMatchingItems = searchQuery === '' || locationItems.length > 0;
      return hasMatchingItems;
    });
  }, [currentLocations, filteredItems, searchQuery]);

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
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
      <PageHeader 
        title="Inventory" 
        onMenuClick={onMenuClick} 
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
                  className="w-full h-14 pl-11 pr-14 bg-m3-surface-container-high border-none rounded-full outline-none focus:ring-2 focus:ring-m3-primary/20 text-base sm:text-lg font-medium placeholder:text-xs sm:placeholder:text-base placeholder:text-m3-on-surface-variant/60 transition-all shadow-sm hover:shadow-md focus:shadow-md"
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
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsAddingLocation(false)}
                        className="flex-1 px-4 py-3 text-m3-on-surface-variant font-bold text-sm hover:bg-m3-surface-variant/10 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={!newLocationName.trim()}
                        className="flex-1 px-4 py-3 bg-m3-primary text-m3-on-primary font-bold text-sm rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
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
          {activeTab === 'ingredients' ? (
            /* Location-based cards for ingredients */
            <Reorder.Group 
              values={displayLocations} 
              onReorder={handleReorderLocations}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {displayLocations.map((location, index) => (
                <ReorderableLocationCard
                  key={location}
                  location={location}
                  index={index}
                  locationItems={filteredItems.filter(item => item.location === location)}
                  toggleCardCollapsed={toggleCardCollapsed}
                  expandedCards={expandedCards}
                  handleExpand={handleExpand}
                  setIsDraggingLoc={setIsDraggingLoc}
                  syncReorderedLocations={syncReorderedLocations}
                  toggleItemUsed={toggleItemUsed}
                  startEdit={startEdit}
                  handleDelete={handleDelete}
                  checkboxStyle={checkboxStyle}
                  handleClearUsed={handleClearUsed}
                  startAddWithLocation={startAddWithLocation}
                  isDraggingLocRef={isDraggingLocRef}
                  onReorderItems={handleReorderItems}
                  onReorderEnd={syncReorderedItems}
                  onMoveItems={setLocationToMove}
                />
              ))}
            </Reorder.Group>
          ) : (
            /* Location-based cards for supplies */
            <Reorder.Group 
              values={displayLocations} 
              onReorder={handleReorderLocations}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {displayLocations.map((location, index) => (
                <ReorderableLocationCard
                  key={location}
                  location={location}
                  index={index}
                  locationItems={filteredItems.filter(item => item.location === location)}
                  toggleCardCollapsed={toggleCardCollapsed}
                  expandedCards={expandedCards}
                  handleExpand={handleExpand}
                  setIsDraggingLoc={setIsDraggingLoc}
                  syncReorderedLocations={syncReorderedLocations}
                  toggleItemUsed={toggleItemUsed}
                  startEdit={startEdit}
                  handleDelete={handleDelete}
                  checkboxStyle={checkboxStyle}
                  handleClearUsed={handleClearUsed}
                  startAddWithLocation={startAddWithLocation}
                  isDraggingLocRef={isDraggingLocRef}
                  onReorderItems={handleReorderItems}
                  onReorderEnd={syncReorderedItems}
                  onMoveItems={setLocationToMove}
                />
              ))}
            </Reorder.Group>
          )}

          {/* Add/Edit Modal */}
          <AnimatePresence>
            {isAddingItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[110]"
                onClick={(e) => {
                  if (e.target === e.currentTarget) resetForm();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-m3-surface rounded-[32px] p-6 lg:p-8 w-full max-w-lg shadow-xl border border-m3-outline/10 max-h-[90vh] overflow-y-auto"
                >
                  <h3 className="text-2xl font-black text-m3-on-surface mb-6">
                    {editingItem ? 'Edit' : 'Add'} {activeTab === 'ingredients' ? 'Ingredient' : 'Supply'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Smart Input for Items */}
                    {useSmartInput ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-m3-on-surface-variant">
                            {activeTab === 'ingredients' ? 'Ingredient' : 'Supply'} *
                          </label>
                          <button
                            type="button"
                            onClick={toggleInputMode}
                            className="text-xs text-m3-primary font-bold hover:text-m3-primary/80"
                          >
                            Individual Fields
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={activeTab === 'ingredients' ? 'e.g. 1 bottle olive oil' : 'e.g. 6 rolls paper towels'}
                          value={smartInput}
                          onChange={(e) => setSmartInput(e.target.value)}
                          onBlur={handleSmartInputParse}
                          onKeyDown={handleSmartKeyDown}
                          className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                          required
                        />
                        <p className="text-xs text-m3-on-surface-variant/60 mt-1">
                          Type {activeTab === 'ingredients' ? 'ingredient' : 'supply'} with quantity & unit (e.g. "{activeTab === 'ingredients' ? '1 bottle olive oil' : '6 rolls paper towels'}"). Press Enter or click away to parse.
                        </p>
                        
                        {/* Show parsed values */}
                        {(formData.name || formData.quantity || formData.unit) && (
                          <div className="mt-3 p-3 bg-m3-surface-variant/10 rounded-xl">
                            <div className="text-xs text-m3-on-surface-variant/60 mb-1">Parsed:</div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <div className="text-m3-on-surface-variant/60">Quantity</div>
                                <div className="font-medium">{formData.quantity || 'None'}</div>
                              </div>
                              <div>
                                <div className="text-m3-on-surface-variant/60">Unit</div>
                                <div className="font-medium">{formData.unit || 'None'}</div>
                              </div>
                              <div>
                                <div className="text-m3-on-surface-variant/60">Name</div>
                                <div className="font-medium">{formData.name || 'None'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Individual Fields */
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-m3-on-surface-variant">
                              Name *
                            </label>
                            <button
                              type="button"
                              onClick={toggleInputMode}
                              className="text-xs text-m3-primary font-bold hover:text-m3-primary/80"
                            >
                              Smart Input
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={`e.g. ${activeTab === 'ingredients' ? 'Extra Virgin Olive Oil' : 'Paper Towels'}`}
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                              Quantity
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 2"
                              value={formData.quantity}
                              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                              className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                              Unit
                            </label>
                            <select
                              value={formData.unit}
                              onChange={(e) => setFormData({...formData, unit: e.target.value})}
                              className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                            >
                              <option value="">Select unit</option>
                              {commonUnits[activeTab as keyof typeof commonUnits].map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                        Location
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                      >
                        <option value="">Select location</option>
                        {currentLocations.map(location => (
                          <option key={location} value={location}>{location}</option>
                        ))}
                      </select>
                    </div>

                    {activeTab === 'ingredients' && (
                      <div>
                        <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                          Purchased On (Optional)
                        </label>
                        <input
                          type="date"
                          value={formData.purchasedOn}
                          onChange={(e) => setFormData({...formData, purchasedOn: e.target.value})}
                          className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                        Notes
                      </label>
                      <textarea
                        placeholder="Additional notes or details"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-[0.4] py-2.5 px-6 border border-m3-outline text-m3-primary rounded-[20px] font-medium hover:bg-m3-primary/8 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-[0.6] py-2.5 px-6 bg-m3-primary text-m3-on-primary rounded-[20px] font-medium hover:bg-m3-primary/90 shadow-sm hover:shadow-md transition-all"
                      >
                        {editingItem ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}          </AnimatePresence>
        </div>
      </main>

      {/* Full-Page Expansion Modal */}
      <AnimatePresence>
        {expandedLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
          >
            <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface">
              <div className="flex items-center flex-1 min-w-0">
                {isEditingLocationName ? (
                  <input
                    autoFocus
                    type="text"
                    value={editLocationNameValue}
                    onChange={(e) => setEditLocationNameValue(e.target.value)}
                    onBlur={handleUpdateLocationName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateLocationName();
                      if (e.key === 'Escape') setIsEditingLocationName(false);
                    }}
                    className="text-2xl font-black text-m3-on-surface bg-m3-surface-variant/20 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-m3-primary w-full max-w-md"
                  />
                ) : (
                  <h2 
                    onClick={() => handleStartEditLocationName(expandedLocation)}
                    className="text-2xl font-black text-m3-on-surface truncate cursor-pointer hover:text-m3-primary transition-colors"
                    title="Click to rename"
                  >
                    {expandedLocation}
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
                  onClick={() => setLocationToDelete(expandedLocation)}
                  className="flex items-center justify-center w-10 h-10 text-m3-error font-bold hover:bg-m3-error/10 rounded-xl transition-all"
                  title="Delete Location"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-4 lg:p-6">
              <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3">
                {(() => {
                  const expandedItems = filteredItems.filter(item => item.location === expandedLocation);
                  const usedCount = expandedItems.filter(i => i.used).length;
                  
                  return (
                    <>
                      <AnimatePresence>
                        {usedCount > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-between items-center px-2 overflow-hidden mb-2"
                          >
                            <button
                              onClick={() => setLocationToMove(expandedLocation)}
                              className="text-xs font-black text-m3-primary hover:underline transition-all uppercase tracking-wider py-1"
                            >
                              Move to Location
                            </button>
                            <button
                              onClick={() => handleClearUsed(expandedLocation)}
                              className="text-xs font-black text-m3-error hover:underline transition-all uppercase tracking-wider py-1"
                            >
                              Clear Used
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {expandedItems.length > 0 ? (
                        expandedItems.map((item, index) => (
                          <InventoryListItem
                            key={item.id}
                            item={item}
                            onToggleUsed={toggleItemUsed}
                            onEdit={startEdit}
                            onDelete={handleDelete}
                            isExpandedView={true}
                            isEditMode={isEditMode}
                            checkboxStyle={checkboxStyle}
                            className="p-3 sm:p-4 bg-m3-surface-variant/10 rounded-xl lg:rounded-2xl hover:bg-m3-surface-variant/20"
                          />
                        ))
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                          <p className="text-m3-on-surface-variant/60 text-sm font-medium">
                            No ingredients in {expandedLocation.toLowerCase()}
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              
              <div className="border-t border-m3-outline/5 pt-3 mt-3">
                <button
                  onClick={() => {
                    startAddWithLocation(expandedLocation);
                  }}
                  className="w-full px-4 py-2 bg-m3-primary text-m3-on-primary rounded-2xl font-bold hover:bg-m3-primary/90 shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Add to {expandedLocation}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Location Confirmation Modal */}
      <AnimatePresence>
        {locationToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLocationToDelete(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-m3-surface w-full max-w-sm rounded-[28px] p-6 shadow-xl"
            >
              <h3 className="text-xl font-bold text-m3-on-surface mb-2">Delete Location?</h3>
              <p className="text-m3-on-surface-variant mb-6">
                Are you sure you want to delete <span className="font-bold">"{locationToDelete}"</span>? 
                This will also delete all items stored in this location. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setLocationToDelete(null)}
                  className="px-6 py-2.5 text-m3-primary font-bold hover:bg-m3-primary/8 rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteLocation(locationToDelete)}
                  className="px-6 py-2.5 bg-m3-error text-m3-on-error font-bold hover:bg-m3-error/90 rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Location Modal */}
      <AnimatePresence>
        {locationToMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
            onClick={() => setLocationToMove(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-m3-surface w-full max-w-sm rounded-[28px] p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-m3-primary/10 rounded-full flex items-center justify-center text-m3-primary">
                    <MoveHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-m3-on-surface leading-tight">Move Items</h3>
                    <p className="text-xs text-m3-on-surface-variant/60">From {locationToMove}</p>
                  </div>
                </div>
                
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {currentLocations.filter(loc => loc !== locationToMove).map(loc => (
                    <button
                      key={loc}
                      onClick={() => handleMoveLocationItems(locationToMove, loc)}
                      className="w-full text-left px-4 py-3 hover:bg-m3-primary/5 rounded-xl transition-all flex items-center justify-between group"
                    >
                      <span className="font-bold text-sm text-m3-on-surface group-hover:text-m3-primary transition-colors">{loc}</span>
                      <ChevronDown size={16} className="text-m3-on-surface-variant/20 -rotate-90" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setLocationToMove(null)}
                  className="w-full px-4 py-3 text-m3-on-surface-variant font-bold text-sm hover:bg-m3-surface-variant/10 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
  );
});