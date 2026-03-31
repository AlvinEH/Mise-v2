import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Package, Apple, Search, Check, X, Filter, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { PageHeader } from '../components/layout/PageHeader';
import { handleFirestoreError, OperationType } from '../utils/firestore';
import { parseShoppingItem } from '../utils/shoppingItems';

interface InventoryPageProps {
  onMenuClick: () => void;
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
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export const InventoryPage = ({ onMenuClick }: InventoryPageProps) => {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'supplies'>('ingredients');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
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
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({ 
    'Refrigerator': true, 'Freezer': true, 'Pantry': true,
    'Closet': true, 'Washroom': true
  });
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  // Common units for ingredients and supplies
  const commonUnits = {
    ingredients: ['cups', 'tbsp', 'tsp', 'oz', 'lbs', 'g', 'kg', 'ml', 'L', 'pieces', 'cans', 'bottles', 'bags', 'Racks'],
    supplies: ['pieces', 'rolls', 'boxes', 'packs', 'sets', 'bottles', 'tubes', 'sheets']
  };

  // Location options for filtering and forms
  const locationOptions = {
    ingredients: ['Freezer', 'Refrigerator', 'Pantry'],
    supplies: ['Closet', 'Washroom']
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', user.uid),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));
      setItems(inventoryData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    return unsubscribe;
  }, [user]);

  const filteredItems = items.filter(item => {
    const matchesTab = item.category === (activeTab === 'ingredients' ? 'ingredient' : 'supply');
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
    return matchesTab && matchesSearch && matchesLocation;
  });

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
        await addDoc(collection(db, 'inventory'), {
          ...itemData,
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

  // Reset location filter when switching tabs
  const handleTabSwitch = (tab: 'ingredients' | 'supplies') => {
    setActiveTab(tab);
    setLocationFilter('all');
    setSearchQuery('');
    setShowFilterModal(false);
  };

  // Handle filter selection
  const handleLocationFilterSelect = (location: string) => {
    setLocationFilter(location);
  };

  // Handle expansion functions
  const handleExpand = (location: string) => {
    setExpandedLocation(location);
    window.history.pushState({ expanded: location }, '');
  };

  const handleCollapse = () => {
    if (expandedLocation) {
      setExpandedLocation(null);
      window.history.back();
    }
  };

  const toggleCardCollapsed = (location: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  useEffect(() => {
    const handlePopState = () => {
      if (expandedLocation) {
        setExpandedLocation(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [expandedLocation]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLocationDropdownOpen && !(event.target as Element).closest('.location-dropdown')) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLocationDropdownOpen]);

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
      <PageHeader title="Inventory" onMenuClick={onMenuClick} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 min-h-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 lg:mb-12">
            <h2 className="text-4xl font-black text-m3-on-surface tracking-tight mb-2">Inventory</h2>
            <p className="text-m3-on-surface-variant font-medium">Track your ingredients and kitchen supplies.</p>
          </div>

          {/* Tabs and Filter */}
          <div className="mb-8 flex items-center justify-center relative max-w-2xl mx-auto px-12">
            <div className="flex items-center gap-1 bg-m3-surface-variant/20 p-1 rounded-[20px] w-full max-w-[260px]">
              <button
                onClick={() => handleTabSwitch('ingredients')}
                className={`flex-1 px-2 py-2.5 rounded-[16px] text-sm font-bold transition-all flex items-center justify-center ${
                  activeTab === 'ingredients'
                    ? 'bg-m3-primary text-m3-on-primary shadow-md'
                    : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                }`}
              >
                Ingredients
              </button>
              <button
                onClick={() => handleTabSwitch('supplies')}
                className={`flex-1 px-2 py-2.5 rounded-[16px] text-sm font-bold transition-all flex items-center justify-center ${
                  activeTab === 'supplies'
                    ? 'bg-m3-primary text-m3-on-primary shadow-md'
                    : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                }`}
              >
                Supplies
              </button>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterModal(true)}
              className={`absolute right-0 p-3 rounded-full hover:bg-m3-surface-variant/30 transition-all ${
                searchQuery || locationFilter !== 'all' ? 'text-m3-primary bg-m3-primary/10' : 'text-m3-on-surface-variant'
              }`}
              title="Search and Filter"
            >
              <Filter size={20} />
              {(searchQuery || locationFilter !== 'all') && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-m3-primary rounded-full" />
              )}
            </button>
          </div>

          {/* Content Display */}
          {activeTab === 'ingredients' ? (
            /* Location-based cards for ingredients */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {locationOptions.ingredients
                .filter(location => {
                  const matchesLocationFilter = locationFilter === 'all' || location === locationFilter;
                  const locationItems = filteredItems.filter(item => item.location === location);
                  const hasMatchingItems = searchQuery === '' || locationItems.length > 0;
                  return matchesLocationFilter && hasMatchingItems;
                })
                .map((location) => {
                const locationItems = filteredItems.filter(item => item.location === location);
                
                return (
                  <motion.div
                    key={location}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-sm flex flex-col h-fit"
                  >
                    {/* Header Section */}
                    <div className="flex items-center justify-between px-6 py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1 hover:bg-m3-surface-variant/10 -m-2 p-2 rounded-xl transition-colors"
                        onClick={() => toggleCardCollapsed(location)}
                      >
                        <div>
                          <h3 className="text-xl font-black text-m3-on-surface">{location}</h3>
                          <span className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider mt-[-2px]">
                            {locationItems.length} items
                          </span>
                        </div>
                        <div className="ml-auto text-m3-on-surface-variant/40">
                          {collapsedCards[location] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                      </div>
                      <div className="flex items-center ml-2">
                        <button
                          onClick={() => handleExpand(location)}
                          className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
                          title="Full Screen"
                        >
                          <Maximize2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Expandable Content Section */}
                    <AnimatePresence initial={false}>
                      {!collapsedCards[location] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="flex flex-col overflow-hidden px-6"
                          style={{ 
                            maxHeight: locationItems.length === 0 ? '280px' : Math.min(10, locationItems.length) * 65 + 120 + 'px'
                          }}
                        >
                          <div className={`space-y-2 lg:space-y-2 pb-4 ${locationItems.length > 10 ? 'overflow-y-auto' : ''}`}>
                            {locationItems.length > 0 ? (
                              <>
                                {locationItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 lg:gap-3 p-2 lg:p-2.5 bg-m3-surface-variant/10 rounded-xl lg:rounded-2xl transition-all group hover:bg-m3-surface-variant/20"
                                >
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-m3-on-surface truncate">
                                      {item.name}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs text-m3-on-surface-variant/70">
                                      {item.quantity && (
                                        <span className="font-medium">
                                          {item.quantity} {item.unit}
                                        </span>
                                      )}
                                      {item.purchasedOn && (
                                        <span>
                                          {new Date(item.purchasedOn).toLocaleDateString()}
                                        </span>
                                      )}
                                      {item.notes && (
                                        <span className="italic truncate max-w-[120px]">
                                          {item.notes}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEdit(item)}
                                      className="p-1.5 text-m3-on-surface-variant hover:text-m3-primary rounded-lg hover:bg-m3-primary/10 transition-colors"
                                      title="Edit item"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item)}
                                      className="p-1.5 text-m3-on-surface-variant hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                      title="Delete item"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                ))}
                              </>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                <p className="text-m3-on-surface-variant/60 text-sm font-medium">
                                  No ingredients in {location.toLowerCase()}
                                </p>
                              </div>
                              )}
                          </div>
                          
                          {/* Footer Section - Part of collapsible content */}
                          <div className="border-t border-m3-outline/10 p-3">
                            <button
                              onClick={() => startAddWithLocation(location)}
                              className="w-full p-2 bg-m3-primary/10 text-m3-primary rounded-xl hover:bg-m3-primary/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <Plus size={14} />
                              Add to {location}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Location-based cards for supplies */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {locationOptions.supplies
                .filter(location => {
                  const matchesLocationFilter = locationFilter === 'all' || location === locationFilter;
                  const locationItems = filteredItems.filter(item => item.location === location);
                  const hasMatchingItems = searchQuery === '' || locationItems.length > 0;
                  return matchesLocationFilter && hasMatchingItems;
                })
                .map((location) => {
                const locationItems = filteredItems.filter(item => item.location === location);
                
                return (
                  <motion.div
                    key={location}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-sm flex flex-col h-fit"
                  >
                    {/* Header Section */}
                    <div className="flex items-center justify-between px-6 py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1 hover:bg-m3-surface-variant/10 -m-2 p-2 rounded-xl transition-colors"
                        onClick={() => toggleCardCollapsed(location)}
                      >
                        <div>
                          <h3 className="text-xl font-black text-m3-on-surface">{location}</h3>
                          <span className="text-[10px] font-bold text-m3-on-surface-variant/60 uppercase tracking-wider mt-[-2px]">
                            {locationItems.length} items
                          </span>
                        </div>
                        <div className="ml-auto text-m3-on-surface-variant/40">
                          {collapsedCards[location] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                      </div>
                      <div className="flex items-center ml-6">
                        <button
                          onClick={() => handleExpand(location)}
                          className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
                          title="Full Screen"
                        >
                          <Maximize2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Expandable Content Section */}
                    <AnimatePresence initial={false}>
                      {!collapsedCards[location] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="flex flex-col overflow-hidden px-6"
                          style={{ 
                            maxHeight: locationItems.length === 0 ? '280px' : Math.min(10, locationItems.length) * 65 + 120 + 'px'
                          }}
                        >
                          <div className={`space-y-2 lg:space-y-2 pb-4 ${locationItems.length > 10 ? 'overflow-y-auto' : ''}`}>
                            {locationItems.length > 0 ? (
                              <>
                                {locationItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 lg:gap-3 p-2 lg:p-2.5 bg-m3-surface-variant/10 rounded-xl lg:rounded-2xl transition-all group hover:bg-m3-surface-variant/20"
                                >
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-m3-on-surface truncate">
                                      {item.name}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs text-m3-on-surface-variant/70">
                                      {item.quantity && (
                                        <span className="font-medium">
                                          {item.quantity} {item.unit}
                                        </span>
                                      )}
                                      {item.purchasedOn && (
                                        <span>
                                          {new Date(item.purchasedOn).toLocaleDateString()}
                                        </span>
                                      )}
                                      {item.notes && (
                                        <span className="italic truncate max-w-[120px]">
                                          {item.notes}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEdit(item)}
                                      className="p-1.5 text-m3-on-surface-variant hover:text-m3-primary rounded-lg hover:bg-m3-primary/10 transition-colors"
                                      title="Edit item"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item)}
                                      className="p-1.5 text-m3-on-surface-variant hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                      title="Delete item"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                ))}
                              </>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                <p className="text-m3-on-surface-variant/60 text-sm font-medium">
                                  No supplies in {location.toLowerCase()}
                                </p>
                              </div>
                              )}
                          </div>
                          
                          {/* Footer Section - Part of collapsible content */}
                          <div className="border-t border-m3-outline/10 p-3">
                            <button
                              onClick={() => startAddWithLocation(location)}
                              className="w-full p-2 bg-m3-primary/10 text-m3-primary rounded-xl hover:bg-m3-primary/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <Plus size={14} />
                              Add to {location}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
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
                          autoFocus
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
                            autoFocus={!useSmartInput}
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
                        {locationOptions[activeTab as keyof typeof locationOptions].map(location => (
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
                        placeholder="Additional notes or details..."
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

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFilterModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-m3-surface rounded-[32px] p-6 lg:p-8 w-full max-w-md shadow-xl border border-m3-outline/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-m3-on-surface">
                  Search & Filter
                </h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-m3-on-surface-variant hover:text-m3-on-surface rounded-full hover:bg-m3-surface-variant/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                    Search {activeTab}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/50" size={20} />
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                    Filter by Location
                  </label>
                  <div className="relative location-dropdown">
                    <button
                      onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                      className="flex items-center justify-between w-full px-4 py-3 bg-m3-surface-variant/20 hover:bg-m3-surface-variant/30 border border-m3-outline/20 rounded-2xl transition-all text-sm font-medium text-m3-on-surface"
                    >
                      <span>
                        {locationFilter === 'all' ? 'All Locations' : locationFilter}
                      </span>
                      <ChevronDown size={16} className={`text-m3-on-surface-variant transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isLocationDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-m3-surface border border-m3-outline/10 rounded-2xl shadow-xl z-10 overflow-hidden">
                        <button
                          onClick={() => {
                            handleLocationFilterSelect('all');
                            setIsLocationDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-m3-surface-variant/20 transition-all text-sm font-medium ${
                            locationFilter === 'all' ? 'bg-m3-primary/5 text-m3-primary' : 'text-m3-on-surface'
                          }`}
                        >
                          All Locations
                        </button>
                        
                        {locationOptions[activeTab as keyof typeof locationOptions].map((location) => (
                          <button
                            key={location}
                            onClick={() => {
                              handleLocationFilterSelect(location);
                              setIsLocationDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-m3-surface-variant/20 transition-all text-sm font-medium ${
                              locationFilter === location ? 'bg-m3-primary/5 text-m3-primary' : 'text-m3-on-surface'
                            }`}
                          >
                            {location}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setLocationFilter('all');
                  }}
                  className="flex-1 px-6 py-3 bg-m3-surface-variant/20 text-m3-on-surface-variant rounded-2xl font-bold hover:bg-m3-surface-variant/30 transition-all"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-6 py-3 bg-m3-primary text-m3-on-primary rounded-2xl font-bold hover:bg-m3-primary/90 shadow-md transition-all"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Page Expansion Modal */}
      <AnimatePresence>
        {expandedLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden"
          >
            <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface">
              <div className="flex items-center">
                <h2 className="text-2xl font-black text-m3-on-surface">
                  {expandedLocation}
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
            
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-4 lg:p-6">
              <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3">
                {(() => {
                  const expandedItems = filteredItems.filter(item => item.location === expandedLocation);
                  return expandedItems.length > 0 ? (
                    expandedItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2 lg:gap-3 p-3 sm:p-4 bg-m3-surface-variant/10 rounded-xl lg:rounded-2xl transition-all group hover:bg-m3-surface-variant/20"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base text-m3-on-surface truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-m3-on-surface-variant/70">
                            {item.quantity && (
                              <span className="font-medium">
                                {item.quantity} {item.unit}
                              </span>
                            )}
                            {item.purchasedOn && (
                              <span>
                                {new Date(item.purchasedOn).toLocaleDateString()}
                              </span>
                            )}
                            {item.notes && (
                              <span className="italic truncate max-w-[200px]">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-2 text-m3-on-surface-variant hover:text-m3-primary rounded-lg hover:bg-m3-primary/10 transition-colors"
                            title="Edit item"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-m3-on-surface-variant hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                      <p className="text-m3-on-surface-variant/60 text-sm font-medium">
                        No ingredients in {expandedLocation.toLowerCase()}
                      </p>
                    </div>
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
    </div>
  );
};