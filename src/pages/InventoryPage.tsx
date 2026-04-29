import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls, LayoutGroup } from 'motion/react';
import { Plus, Edit2, Trash2, Package, Apple, Check, X, ChevronDown, ChevronUp, Maximize2, Minimize2, ArrowUpDown, MoveHorizontal, ArrowRightLeft, ArrowUp, ArrowDown, Settings, SlidersHorizontal, ListOrdered } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch, getDocs, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { PageHeader } from '../components/layout/PageHeader';
import { HeaderSearchBar } from '../components/ui/HeaderSearchBar';
import { handleFirestoreError, OperationType } from '../utils/firestore';
import { parseShoppingItem } from '../utils/shoppingItems';
import { InventoryItem, CheckboxStyle } from '../types';
import { InventoryListItem } from '../components/inventory/InventoryListItem';
import { LocationCard } from '../components/inventory/LocationCard';
import { useInventory } from '../hooks';
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
  user: User;
  checkboxStyle: CheckboxStyle;
}

export const InventoryPage = memo(({ user, checkboxStyle }: InventoryPageProps) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'supplies'>('ingredients');
  const {
    items,
    setItems,
    dbLocations,
    setDbLocations,
    storeLists,
    isInitialLoad,
    toggleItemUsed,
    toggleItemLow,
    handleDeleteItem,
    handleDeleteLocation: baseHandleDeleteLocation,
    handleMoveLocationItems: baseHandleMoveLocationItems,
    handleAddLocation: baseHandleAddLocation,
    handleUpdateLocationName: baseHandleUpdateLocationName,
    handleClearUsed,
    handleRestockUsed,
    handleClearAndRestockUsed,
    handleAddLowToShoppingList: baseHandleAddLowToShoppingList,
    handleSubmit: baseHandleSubmit,
    syncReorderedItems,
    syncReorderedLocations,
    isDraggingLocRef,
    isSyncingItemsRef,
    isSyncingLocsRef,
    pendingLocsRef,
    pendingItemsRef
  } = useInventory(user);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [itemSortOrder, setItemSortOrder] = useState<InventorySortOrder>('custom');
  const [isEditingLocationName, setIsEditingLocationName] = useState(false);
  const [isAutoSortModalOpen, setIsAutoSortModalOpen] = useState(false);
  const { addToast } = useToast();
  const [editLocationNameValue, setEditLocationNameValue] = useState('');
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  const [locationToMove, setLocationToMove] = useState<string | null>(null);
  const [isDraggingLoc, setIsDraggingLoc] = useState(false);
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

  const itemsByLocation = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    const currentList = activeTab === 'ingredients' ? ingredientItems : supplyItems;
    currentList.forEach(item => {
      const loc = item.location || 'Uncategorized';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
    return groups;
  }, [activeTab, ingredientItems, supplyItems]);

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

  const handleAddLowToShoppingList = useCallback(async (location: string) => {
    await baseHandleAddLowToShoppingList(location);
  }, [baseHandleAddLowToShoppingList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await baseHandleSubmit(formData, useSmartInput, smartInput, editingItem, activeTab, resetForm);
    
    if (!editingItem) {
      const loc = formData.location.trim() || 'Uncategorized';
      setTimeout(() => {
        const listElement = locationListRefs.current[loc];
        if (listElement) {
          listElement.scrollTo({ top: listElement.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
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
    const smartValue = [item.quantity, item.unit, item.name].filter(Boolean).join(' ');
    setSmartInput(smartValue);
    setUseSmartInput(true);
    setIsAddingItem(true);
  };

  const resetForm = useCallback(() => {
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
  }, []);

  const handleDeleteLocation = async (location: string) => {
    await baseHandleDeleteLocation(location);
    if (expandedLocation === location) {
      setExpandedLocation(null);
      setIsEditMode(false);
    }
    setLocationToDelete(null);
  };

  const handleMoveLocationItems = async (sourceLocation: string, targetLocation: string) => {
    await baseHandleMoveLocationItems(sourceLocation, targetLocation);
    setLocationToMove(null);
  };

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
    if (!newLocationName.trim()) return;
    await baseHandleAddLocation(newLocationName, activeTab === 'ingredients' ? 'ingredient' : 'supply');
    setNewLocationName('');
    setIsAddingLocation(false);
  };

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

    setIsEditingLocationName(false);
    const newLocation = editLocationNameValue.trim();
    await baseHandleUpdateLocationName(expandedLocation, newLocation);

    setExpandedCards(prev => {
      const next = { ...prev };
      if (expandedLocation in next) {
        next[newLocation] = next[expandedLocation];
        delete next[expandedLocation];
      }
      return next;
    });

    setExpandedLocation(newLocation);
  };

  const handleCollapse = useCallback(() => {
    if (expandedLocation) {
      setExpandedLocation(null);
      setIsEditMode(false);
      setExpandedCards({});
      window.history.back();
    }
  }, [expandedLocation]);

  const handleMoveLocationOrder = async (index: number, direction: 'up' | 'down') => {
    const category = activeTab === 'ingredients' ? 'ingredient' : 'supply';
    const categoryLocNames = [...currentLocations];
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categoryLocNames.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = categoryLocNames[index];
    categoryLocNames[index] = categoryLocNames[newIndex];
    categoryLocNames[newIndex] = temp;

    const newLocs = [...dbLocations];
    categoryLocNames.forEach((name, i) => {
      const loc = newLocs.find(l => l.name === name && l.category === category);
      if (loc) loc.order = i;
    });

    setDbLocations(newLocs);
    pendingLocsRef.current = newLocs;
    await syncReorderedLocations(category);
  };

  useEffect(() => {
    setExpandedCards({});
  }, [activeTab]);

  const toggleCardCollapsed = (location: string) => {
    if (isDraggingLocRef.current) return;
    setExpandedCards(prev => {
      const isCurrentlyExpanded = !!prev[location];
      if (!isCurrentlyExpanded) {
        const newState: Record<string, boolean> = {};
        newState[location] = true;
        return newState;
      } else {
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

  const statesRef = useRef({
    isAddingLocation, 
    isAddingItem, 
    editingItem, 
    locationToDelete, 
    isEditingLocationName, 
    isEditMode, 
    expandedLocation, 
    isSortingLocations,
    isSortingItems,
    isMenuOpen
  });

  useEffect(() => {
    statesRef.current = {
      isAddingLocation, 
      isAddingItem, 
      editingItem, 
      locationToDelete, 
      isEditingLocationName, 
      isEditMode, 
      expandedLocation, 
      isSortingLocations,
      isSortingItems,
      isMenuOpen
    };
  }, [isAddingLocation, isAddingItem, editingItem, locationToDelete, isEditingLocationName, isEditMode, expandedLocation, isSortingLocations, isSortingItems, isMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const { 
          isAddingLocation, 
          isAddingItem, 
          editingItem, 
          locationToDelete, 
          isEditingLocationName, 
          isEditMode, 
          expandedLocation, 
          isSortingLocations,
          isSortingItems,
          isMenuOpen
        } = statesRef.current;

        if (isAddingLocation) setIsAddingLocation(false);
        else if (isAddingItem || editingItem) resetForm();
        else if (locationToDelete) setLocationToDelete(null);
        else if (isEditingLocationName) setIsEditingLocationName(false);
        else if (isEditMode) setIsEditMode(false);
        else if (expandedLocation) handleCollapse();
        else if (isSortingLocations) setIsSortingLocations(false);
        else if (isSortingItems) setIsSortingItems(false);
        else if (isMenuOpen) setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCollapse, resetForm]);

  const handleReorderItems = useCallback((location: string, newItems: InventoryItem[]) => {
    setItems(prev => {
      const otherItems = prev.filter(item => item.location !== location);
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        order: index
      }));
      const allItems = [...otherItems, ...updatedItems];
      pendingItemsRef.current = allItems;
      return allItems;
    });
  }, [setItems, pendingItemsRef]);

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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <PageHeader title="Inventory" />
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
    <>
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <PageHeader 
        title={isSearchExpanded ? "" : "Inventory"} 
        actions={
          <>
            <HeaderSearchBar
              isExpanded={isSearchExpanded}
              onExpandChange={setIsSearchExpanded}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              placeholder={`Search ${activeTab === 'ingredients' ? 'Ingredients' : 'Supplies'}`}
              maxWidth="66vw"
            />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full transition-all flex-shrink-0 ${
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
                    className="absolute right-0 top-12 z-[100] w-56 bg-m3-surface-container rounded-2xl shadow-2xl border border-m3-outline/10 overflow-hidden py-3 px-3 flex flex-col gap-1"
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
          </>
        }
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 min-h-0">
        <div className="max-w-7xl mx-auto">
          {/* Tabs and Indicator */}
          <div className="mb-8 flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center w-full">
              <div className="flex items-center gap-1 bg-m3-surface-container-high p-1 rounded-full w-full sm:w-auto shadow-sm">
                <button
                  onClick={() => handleTabSwitch('ingredients')}
                  className={`flex-1 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center min-w-[120px] ${
                    activeTab === 'ingredients' 
                      ? 'bg-m3-primary text-m3-on-primary shadow-md' 
                      : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                  }`}
                >
                  Ingredients
                </button>
                <button
                  onClick={() => handleTabSwitch('supplies')}
                  className={`flex-1 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center min-w-[120px] ${
                    activeTab === 'supplies' 
                      ? 'bg-m3-primary text-m3-on-primary shadow-md' 
                      : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                  }`}
                >
                  Supplies
                </button>
              </div>
            </div>

            {/* Active Search Indicator */}
            {searchQuery && (
              <div className="flex items-center justify-between bg-m3-primary/5 px-4 py-2 rounded-xl border border-m3-primary/10">
                <span className="text-xs font-bold text-m3-primary truncate">
                  Showing results for "{searchQuery}"
                </span>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-black text-m3-primary hover:underline ml-2 flex-shrink-0"
                >
                  Clear
                </button>
              </div>
            )}
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
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { 
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  },
                  exit: { opacity: 0 }
                }}
                className="relative"
              >
                {/* Locations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {(activeTab === 'ingredients' ? displayIngredientLocations : displaySupplyLocations).map((location, index) => (
                    <LocationCard
                      key={`${activeTab}-${location}`}
                      location={location}
                      index={index}
                      locationItems={itemsByLocation[location] || []}
                      toggleCardCollapsed={toggleCardCollapsed}
                      expandedCards={expandedCards}
                      handleExpand={handleExpand}
                      toggleItemUsed={toggleItemUsed}
                      startEdit={startEdit}
                      handleDelete={handleDeleteItem}
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
        handleDelete={handleDeleteItem}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 right-6 z-40"
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
    </>
  );
});