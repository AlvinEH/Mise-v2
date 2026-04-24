import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, MapPin, Package, Edit2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { User } from 'firebase/auth';
import { SESSION_KEYS, getSessionData } from '../../utils/cache';

interface AutoSortRule {
  id: string;
  keyword: string;
  location: string;
  category: 'ingredient' | 'supply';
}

interface AutoSortSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate?: () => void;
}

export const AutoSortSettingsModal: React.FC<AutoSortSettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [rules, setRules] = useState<AutoSortRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newRule, setNewRule] = useState({
    keyword: '',
    location: '',
    category: 'ingredient' as 'ingredient' | 'supply'
  });
  const [dbLocations, setDbLocations] = useState<{name: string, category: string}[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  const sessionNewKeywords = React.useMemo(() => 
    getSessionData<string[]>(SESSION_KEYS.NEW_AUTO_SORT_RULES) || [], 
    [isOpen] // Refresh when modal opens
  );

  useEffect(() => {
    if (!isOpen || !user) {
      setIsLoading(true);
      return;
    }

    let rulesLoaded = false;
    let locsLoaded = false;

    const q = query(
      collection(db, 'inventoryAutoSortRules'),
      where('userId', '==', user.uid),
      orderBy('keyword', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutoSortRule));
      setRules(data);
      rulesLoaded = true;
      if (locsLoaded) setIsLoading(false);
    });

    const qLocs = query(
      collection(db, 'inventoryLocations'),
      where('userId', '==', user.uid)
    );

    const unsubscribeLocs = onSnapshot(qLocs, (snapshot) => {
      const locs = snapshot.docs.map(doc => ({
        name: doc.data().name,
        category: doc.data().category
      }));
      setDbLocations(locs);
      locsLoaded = true;
      if (rulesLoaded) setIsLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribeLocs();
    };
  }, [isOpen, user]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.keyword.trim() || !newRule.location.trim()) return;

    try {
      if (editingRuleId) {
        await updateDoc(doc(db, 'inventoryAutoSortRules', editingRuleId), {
          ...newRule,
          keyword: newRule.keyword.trim().toLowerCase(),
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'inventoryAutoSortRules'), {
          ...newRule,
          keyword: newRule.keyword.trim().toLowerCase(),
          userId: user.uid,
          createdAt: Timestamp.now()
        });
      }
      setNewRule({ keyword: '', location: '', category: 'ingredient' });
      setIsAdding(false);
      setEditingRuleId(null);
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleEditRule = (rule: AutoSortRule) => {
    setNewRule({
      keyword: rule.keyword,
      location: rule.location,
      category: rule.category
    });
    setEditingRuleId(rule.id);
    setIsAdding(true);
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventoryAutoSortRules', id));
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const categoryLocations = React.useMemo(() => {
    const category = newRule.category;
    const defaults = category === 'ingredient' 
      ? ['Refrigerator', 'Freezer', 'Pantry'] 
      : ['Closet', 'Washroom'];
      
    const fromDb = dbLocations
      .filter(loc => loc.category === category)
      .map(loc => loc.name);

    const fromCustomRules = rules
      .filter(rule => rule.category === category)
      .map(rule => rule.location);
      
    return Array.from(new Set([...defaults, ...fromDb, ...fromCustomRules]))
      .sort((a, b) => a.localeCompare(b));
  }, [dbLocations, newRule.category, rules]);

  // Clear location if it's not valid for the current category
  useEffect(() => {
    if (newRule.location && !categoryLocations.includes(newRule.location)) {
      setNewRule(prev => ({ ...prev, location: '' }));
    }
  }, [newRule.category, categoryLocations]);

  const sortRules = (a: any, b: any) => {
    const isANew = sessionNewKeywords.includes(a.keyword.toLowerCase());
    const isBNew = sessionNewKeywords.includes(b.keyword.toLowerCase());

    // 0. Prioritize Session New Rules
    if (isANew && !isBNew) return -1;
    if (!isANew && isBNew) return 1;

    // 1. Sort by Category
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    // 2. Sort by Location
    if (a.location !== b.location) {
      return a.location.localeCompare(b.location);
    }
    // 3. Alphanumeric order for Keywords
    return a.keyword.localeCompare(b.keyword);
  };

  const filteredRules = rules
    .filter(r => 
      r.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort(sortRules);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="autosort-settings-wrapper"
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <motion.div
            key="autosort-settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => isAdding ? setIsAdding(false) : onClose()}
          />
          
          <motion.div
            key="autosort-settings-content-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-md bg-m3-surface rounded-[28px] shadow-2xl p-12 flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-10 h-10 border-4 border-m3-primary/20 border-t-m3-primary rounded-full animate-spin" />
                  <p className="text-sm font-bold text-m3-on-surface-variant/40">Loading rules...</p>
                </motion.div>
              ) : !isAdding ? (
                <motion.div
                  key="rules-list-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full bg-m3-surface rounded-[28px] shadow-2xl flex flex-col h-[80vh]"
                >
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-m3-outline/5 bg-m3-surface-container-low rounded-t-[28px]">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-xl font-black text-m3-on-surface">Auto-Sort Rules</h2>
                    </div>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-m3-surface-variant/20 rounded-full transition-colors text-m3-on-surface-variant"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Actions & Filter */}
                <div className="p-6 pb-2">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/40 transition-colors group-focus-within:text-m3-primary" size={20} />
                    <input
                      type="text"
                      placeholder="Search auto-sort rules"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 bg-m3-surface-variant/10 border border-m3-outline/5 rounded-full outline-none focus:ring-2 focus:ring-m3-primary/20 font-bold placeholder:text-m3-on-surface-variant/40 text-sm transition-all shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 shadow-inner">
                  <div className="flex flex-col gap-2 py-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {filteredRules.map((rule) => (
                        <motion.div
                          key={rule.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group flex items-center justify-between p-4 bg-m3-surface-container-low border border-m3-outline/5 rounded-2xl hover:bg-m3-surface-variant/5 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-m3-on-surface truncate capitalize">{rule.keyword}</h4>
                                {sessionNewKeywords.includes(rule.keyword.toLowerCase()) && (
                                  <span className="px-1.5 py-0.5 bg-m3-primary/10 text-m3-primary text-[10px] font-black rounded-md leading-none">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-m3-on-surface-variant/60 capitalize">
                                  <MapPin size={10} />
                                  {rule.location}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-m3-primary/60 capitalize">
                                  <Package size={10} />
                                  {rule.category}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditRule(rule)}
                              className="p-2 text-m3-on-surface-variant/20 hover:text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                              title="Edit rule"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 text-m3-on-surface-variant/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete rule"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {filteredRules.length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-m3-on-surface-variant/40 font-bold italic">No rules found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-m3-outline/5 bg-m3-surface-container-low/30 rounded-b-[28px]">
                  <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-4 bg-m3-primary text-m3-on-primary rounded-2xl font-black text-sm shadow-lg shadow-m3-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Add New Rule
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="add-rule-form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onSubmit={handleAddRule}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-m3-surface rounded-[32px] shadow-2xl p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-m3-on-surface tracking-tight">
                    {editingRuleId ? 'Edit Rule' : (newRule.keyword ? 'Customize Rule' : 'Add Auto-Sort Rule')}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingRuleId(null);
                      setNewRule({ keyword: '', location: '', category: 'ingredient' });
                    }}
                    className="p-2 hover:bg-m3-surface-variant/20 rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-m3-on-surface-variant pl-1">
                      Keyword
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. apple, milk, bread"
                      value={newRule.keyword}
                      onChange={(e) => setNewRule(prev => ({ ...prev, keyword: e.target.value }))}
                      className="w-full px-4 py-3 bg-m3-surface-variant/10 border border-m3-outline/5 rounded-2xl outline-none focus:border-m3-primary/30 font-bold transition-all text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-m3-on-surface-variant pl-1">
                      Category
                    </label>
                    <div className="flex gap-1 p-1 bg-m3-surface-container-high rounded-full">
                      {(['ingredient', 'supply'] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewRule(prev => ({ ...prev, category: cat }))}
                          className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${
                            newRule.category === cat 
                              ? 'bg-m3-primary text-m3-on-primary shadow-sm' 
                              : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30'
                          }`}
                        >
                          {cat === 'ingredient' ? 'Ingredients' : 'Supplies'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-m3-on-surface-variant pl-1">
                      Target Location
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-m3-surface-variant/10 border border-m3-outline/5 rounded-2xl outline-none focus:border-m3-primary/30 font-bold transition-all text-sm group"
                      >
                        <span className={newRule.location ? 'text-m3-on-surface' : 'text-m3-on-surface-variant/40'}>
                          {newRule.location || 'Select a location'}
                        </span>
                        <ChevronDown 
                          size={18} 
                          className={`text-m3-on-surface-variant/40 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {isLocationDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-40 bg-transparent" 
                              onClick={() => setIsLocationDropdownOpen(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              className="absolute left-0 right-0 top-full mt-2 bg-m3-surface border border-m3-outline/10 rounded-2xl shadow-2xl z-50 py-2 max-h-[160px] overflow-y-auto"
                            >
                              {categoryLocations.length > 0 ? (
                                categoryLocations.map((loc) => (
                                  <button
                                    key={loc}
                                    type="button"
                                    onClick={() => {
                                      setNewRule(prev => ({ ...prev, location: loc }));
                                      setIsLocationDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-m3-primary/5 ${
                                      newRule.location === loc ? 'text-m3-primary bg-m3-primary/5' : 'text-m3-on-surface'
                                    }`}
                                  >
                                    {loc}
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-xs font-bold text-m3-on-surface-variant/40 italic">
                                  No locations found
                                </div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-m3-primary text-m3-on-primary rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </motion.form>
            )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
