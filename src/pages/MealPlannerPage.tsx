import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, UtensilsCrossed, Calendar as CalendarIcon, Trash2, X, Search, Filter } from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfDay, isBefore, getDay, parseISO } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, getDocs, limit } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { PageHeader } from '../components/layout/PageHeader';
import { MealEntry } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore';

interface MealPlannerPageProps {
  onMenuClick: () => void;
}

interface DayMeals {
  lunch?: MealEntry;
  dinner?: MealEntry;
}

export const MealPlannerPage = memo(({ onMenuClick }: MealPlannerPageProps) => {
  const [user] = useAuthState(auth);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [editingDay, setEditingDay] = useState<{ date: string; lunch?: MealEntry; dinner?: MealEntry } | null>(null);
  const [lunchMealName, setLunchMealName] = useState('');
  const [dinnerMealName, setDinnerMealName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  
  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<{ date: string; meals: DayMeals }[]>([]);

  // Calculate date range: 7 days before and 7 days after the selected date
  const getRangeForDate = (date: Date) => {
    return {
      start: subDays(startOfDay(date), 7),
      end: addDays(startOfDay(date), 7)
    };
  };

  const [dateRange, setDateRange] = useState(() => getRangeForDate(new Date()));
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate days from current range
  const days = [];
  let currentDate = dateRange.start;
  while (currentDate <= dateRange.end) {
    days.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  // Group meals by date
  const mealsByDate = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) {
      acc[meal.date] = {};
    }
    acc[meal.date][meal.type] = meal;
    return acc;
  }, {} as Record<string, DayMeals>);

  useEffect(() => {
    if (!user) return;

    const rangeStart = format(dateRange.start, 'yyyy-MM-dd');
    const rangeEnd = format(dateRange.end, 'yyyy-MM-dd');

    const q = query(
      collection(db, 'mealEntries'),
      where('userId', '==', user.uid),
      where('date', '>=', rangeStart),
      where('date', '<=', rangeEnd),
      orderBy('date'),
      orderBy('type')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mealData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MealEntry));
      setMeals(mealData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mealEntries');
    });

    return unsubscribe;
  }, [user, dateRange]);

  // Consolidate scrolling logic
  const scrollToToday = (behavior: ScrollBehavior = 'smooth') => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior, block: 'start' });
    }
  };

  // Initial scroll to today on mount
  // We use 'auto' (instant) for the very first scroll to ensure it lands correctly
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Ensure today is at the top when meals are first loaded (in case of layout shifts)
  const hasInitialMealScroll = useRef(false);
  useEffect(() => {
    if (meals.length > 0 && !hasInitialMealScroll.current) {
      const timer = setTimeout(() => {
        if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
          hasInitialMealScroll.current = true;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [meals.length]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      // Fetch all user meal entries ordered by date desc
      // We'll filter them client-side for "contains" search
      const q = query(
        collection(db, 'mealEntries'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const allMeals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MealEntry));

      // Group by date and filter by search query
      const groupedByDate: Record<string, DayMeals> = {};
      const matchingDates: string[] = [];

      for (const meal of allMeals) {
        const matches = meal.recipeName?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (matches) {
          if (!matchingDates.includes(meal.date)) {
            matchingDates.push(meal.date);
          }
        }
        
        // Always populate grouped data for the matching dates
        if (!groupedByDate[meal.date]) {
          groupedByDate[meal.date] = {};
        }
        groupedByDate[meal.date][meal.type] = meal;
      }

      // Take the 5 most recent matching dates
      const top5Dates = matchingDates.slice(0, 5);
      const results = top5Dates.map(date => ({
        date,
        meals: groupedByDate[date]
      }));

      setSearchResults(results);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'mealEntries');
    } finally {
      setIsSearching(false);
    }
  };

  const closeSearch = () => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const goToResultDate = (dateString: string, dayMeals: DayMeals) => {
    closeSearch();
    const targetDate = parseISO(dateString);
    
    // Check if the date is within the current range
    const isWithinRange = targetDate >= dateRange.start && targetDate <= dateRange.end;

    if (!isWithinRange) {
      // Shift the range to be around the target date
      setDateRange(getRangeForDate(targetDate));
    }

    // Scroll to the date after a short delay to allow for range update/render
    setTimeout(() => {
      const dateElement = document.querySelector(`[data-date="${dateString}"]`);
      if (dateElement) {
        dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Also highlight it briefly
        dateElement.classList.add('ring-2', 'ring-m3-primary');
        setTimeout(() => {
          dateElement.classList.remove('ring-2', 'ring-m3-primary');
        }, 2000);
      }
    }, 500); // Slightly longer delay to ensure DOM is ready if range changed
  };

  const handleEditDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay || !user) return;

    try {
      const promises = [];
      
      // Handle lunch
      if (lunchMealName.trim()) {
        const lunchData: any = {
          userId: user.uid,
          date: editingDay.date,
          type: 'lunch',
          recipeName: lunchMealName.trim(),
          updatedAt: Timestamp.now()
        };
        
        if (editingDay.lunch) {
          // Update existing lunch
          promises.push(updateDoc(doc(db, 'mealEntries', editingDay.lunch.id), lunchData));
        } else {
          // Create new lunch
          lunchData.createdAt = Timestamp.now();
          promises.push(addDoc(collection(db, 'mealEntries'), lunchData));
        }
      } else if (editingDay.lunch) {
        // Delete lunch if name is empty
        promises.push(deleteDoc(doc(db, 'mealEntries', editingDay.lunch.id)));
      }
      
      // Handle dinner
      if (dinnerMealName.trim()) {
        const dinnerData: any = {
          userId: user.uid,
          date: editingDay.date,
          type: 'dinner',
          recipeName: dinnerMealName.trim(),
          updatedAt: Timestamp.now()
        };
        
        if (editingDay.dinner) {
          // Update existing dinner
          promises.push(updateDoc(doc(db, 'mealEntries', editingDay.dinner.id), dinnerData));
        } else {
          // Create new dinner
          dinnerData.createdAt = Timestamp.now();
          promises.push(addDoc(collection(db, 'mealEntries'), dinnerData));
        }
      } else if (editingDay.dinner) {
        // Delete dinner if name is empty
        promises.push(deleteDoc(doc(db, 'mealEntries', editingDay.dinner.id)));
      }
      
      await Promise.all(promises);
      setLunchMealName('');
      setDinnerMealName('');
      setEditingDay(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'mealEntries/day-edit');
    }
  };

  const startEditingDay = (date: string, dayMeals: { lunch?: MealEntry; dinner?: MealEntry }) => {
    setEditingDay({ date, lunch: dayMeals.lunch, dinner: dayMeals.dinner });
    setLunchMealName(dayMeals.lunch?.recipeName || '');
    setDinnerMealName(dayMeals.dinner?.recipeName || '');
  };

  const handleDeleteDay = async () => {
    if (!editingDay || !user) return;
    
    if (!editingDay.lunch && !editingDay.dinner) {
      cancelEdit();
      return;
    }
    
    try {
      const promises = [];
      if (editingDay.lunch) {
        promises.push(deleteDoc(doc(db, 'mealEntries', editingDay.lunch.id)));
      }
      if (editingDay.dinner) {
        promises.push(deleteDoc(doc(db, 'mealEntries', editingDay.dinner.id)));
      }
      
      await Promise.all(promises);
      cancelEdit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'mealEntries/day-delete');
    }
  };

  const cancelEdit = () => {
    setEditingDay(null);
    setLunchMealName('');
    setDinnerMealName('');
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    const isWithinRange = today >= dateRange.start && today <= dateRange.end;

    if (!isWithinRange) {
      setDateRange(getRangeForDate(today));
      // Scroll after range update
      setTimeout(() => scrollToToday('smooth'), 500);
    } else {
      scrollToToday('smooth');
    }
  };

  const handleDatePicker = () => {
    setShowDatePicker(true);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const goToSelectedDate = () => {
    if (!selectedDate) return;
    const targetDate = parseISO(selectedDate);
    const dateString = format(targetDate, 'yyyy-MM-dd');
    
    setShowDatePicker(false);
    
    // Check if the date is within the current range
    const isWithinRange = targetDate >= dateRange.start && targetDate <= dateRange.end;

    if (!isWithinRange) {
      // Shift the range to be around the target date
      setDateRange(getRangeForDate(targetDate));
    }

    // Scroll to the date after a short delay to ensure it's rendered
    setTimeout(() => {
      const dateElement = document.querySelector(`[data-date="${dateString}"]`);
      if (dateElement) {
        dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <PageHeader title="Meal Planner" onMenuClick={onMenuClick} />
        <main className="flex-1 flex items-center justify-start p-8">
          <div className="text-center">
            <UtensilsCrossed size={64} className="mx-auto mb-6 text-m3-on-surface-variant/30" />
            <p className="text-xl font-bold text-m3-on-surface-variant">Please sign in to plan your meals</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-m3-surface">
      <PageHeader 
        title="Meal Planner" 
        onMenuClick={onMenuClick} 
      />
      
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Navigation Controls */}
        <div className="px-6 py-4 bg-m3-surface z-10 border-b border-m3-outline-variant/20">
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={handleDatePicker}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-m3-surface-container text-m3-on-surface font-medium text-sm hover:shadow-md transition-all active:scale-95"
            >
              <CalendarIcon size={18} className="text-m3-primary" />
              Date
            </button>
            <button 
              onClick={goToToday}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-medium text-sm hover:shadow-md transition-all active:scale-95"
            >
              <CalendarIcon size={18} className="text-m3-on-primary" />
              Today
            </button>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-m3-surface-container text-m3-on-surface hover:shadow-md transition-all active:scale-95"
              title="Filter"
            >
              <Filter size={18} className="text-m3-primary" />
            </button>
          </div>
        </div>

        {/* Scrolling Agenda View */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowAnchor: 'none' }}
        >
          <div className="max-w-4xl mx-auto py-6 md:py-12 px-4 md:px-6">
            <div className="space-y-3 md:space-y-4">
              {days.map((date, index) => {
                const dateString = format(date, 'yyyy-MM-dd');
                const dayMeals = mealsByDate[dateString] || {};
                const isToday = isSameDay(date, new Date());
                const isPast = isBefore(date, startOfDay(new Date()));
                const hasNoMeals = !dayMeals.lunch && !dayMeals.dinner;
                const shouldCompact = hasNoMeals;
                
                return (
                  <motion.div
                    key={dateString}
                    ref={isToday ? todayRef : null}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      opacity: { duration: 0.4, delay: index * 0.05 },
                      y: { duration: 0.4, delay: index * 0.05 }
                    }}
                    whileHover={{ y: -4 }}
                    whileTap={{ y: -2, scale: 0.98 }}
                    className="scroll-mt-6 md:scroll-mt-10"
                  >
                    <div 
                      data-date={dateString}
                      onClick={() => startEditingDay(dateString, dayMeals)}
                      className={`group relative grid grid-cols-[48px_1fr] md:grid-cols-[80px_1fr] rounded-[28px] transition-all duration-300 overflow-hidden cursor-pointer ${
                        isToday 
                          ? 'bg-m3-primary-container text-m3-on-primary-container shadow-sm' 
                          : 'bg-m3-surface-container-low border border-m3-outline-variant/30 hover:bg-m3-surface-container'
                      }`}
                    >
                    {/* Date Column */}
                    <div className={`flex flex-col items-center justify-center text-center p-3 md:p-6 ${
                      isToday ? 'bg-m3-primary/10' : 'bg-m3-surface-variant/30'
                    }`}>
                      <span className={`text-[10px] md:text-xs font-medium mb-1 text-m3-on-primary-container/70`}>
                        {format(date, 'EEE')}
                      </span>
                      <span className={`text-xl md:text-3xl font-bold tracking-tight leading-none text-m3-on-primary-container`}>
                        {format(date, 'd')}
                      </span>
                      <span className={`text-[10px] md:text-xs font-medium mt-1 text-m3-on-primary-container/70`}>
                        {format(date, 'MMM')}
                      </span>
                    </div>

                    {/* Meals Column */}
                    {shouldCompact ? (
                      <div className="flex items-center justify-center p-2 md:p-3">
                        <span className="text-xs text-m3-on-surface-variant/30 italic">No meals planned</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 p-3 md:p-6">
                      {/* Lunch Slot */}
                      {dayMeals.lunch && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-semibold tracking-wide text-m3-on-primary-container/60`}>LUNCH</span>
                          </div>
                          
                          <div className={`relative p-1 rounded-xl text-m3-on-primary-container`}>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm leading-tight mb-0.5 truncate">
                                {dayMeals.lunch.recipeName}
                              </h4>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dinner Slot */}
                      {dayMeals.dinner && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-semibold tracking-wide text-m3-on-primary-container/60`}>DINNER</span>
                          </div>
                          
                          <div className={`relative p-1 rounded-xl text-m3-on-primary-container`}>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm leading-tight mb-0.5 truncate">
                                {dayMeals.dinner.recipeName}
                              </h4>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Meal Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={closeSearch}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-m3-surface-container-high rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-m3-outline-variant/20 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-m3-on-surface">Search Meals</h2>
                <button 
                  onClick={closeSearch}
                  className="p-2 rounded-full hover:bg-m3-surface-container-highest transition-colors"
                >
                  <X size={20} className="text-m3-on-surface-variant" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a meal..."
                      autoCapitalize="words"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-m3-surface-container-highest border-none text-m3-on-surface placeholder-m3-on-surface-variant/50 focus:ring-2 focus:ring-m3-primary transition-all"
                    />
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="w-full mt-4 py-3 rounded-2xl bg-m3-primary text-m3-on-primary font-semibold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </form>

                <div className="space-y-4">
                  {searchResults.length > 0 ? (
                    <>
                      <p className="text-sm font-medium text-m3-on-surface-variant px-1">Recent Results</p>
                      {searchResults.map((result) => (
                        <button
                          key={result.date}
                          onClick={() => goToResultDate(result.date, result.meals)}
                          className="w-full p-4 rounded-2xl bg-m3-surface-container-highest hover:bg-m3-surface-container-highest/80 transition-all text-left group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-m3-primary">
                              {format(parseISO(result.date), 'EEEE, MMM d')}
                            </span>
                            <Search size={14} className="text-m3-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="space-y-1">
                            {result.meals.lunch && (
                              <p className="text-sm text-m3-on-surface flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant/50 w-12">Lunch</span>
                                {result.meals.lunch.recipeName}
                              </p>
                            )}
                            {result.meals.dinner && (
                              <p className="text-sm text-m3-on-surface flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant/50 w-12">Dinner</span>
                                {result.meals.dinner.recipeName}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  ) : hasSearched && !isSearching ? (
                    <div className="text-center py-8">
                      <Search size={48} className="mx-auto mb-4 text-m3-on-surface-variant/20" />
                      <p className="text-m3-on-surface-variant">No meals found matching "{searchQuery}"</p>
                    </div>
                  ) : !isSearching && (
                    <div className="text-center py-8">
                      <p className="text-m3-on-surface-variant text-sm italic opacity-60">Find past or future meals by name</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDatePicker(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-m3-surface-container-high/95 backdrop-blur-xl rounded-[28px] p-6 md:p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-m3-on-surface tracking-tight">
                  Go to Date
                </h3>
                <style dangerouslySetInnerHTML={{
                  __html: `
                    input[type="date"]::-webkit-calendar-picker-indicator {
                      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23006d3b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3e%3c/rect%3e%3cline x1='16' y1='2' x2='16' y2='6'%3e%3c/line%3e%3cline x1='8' y1='2' x2='8' y2='6'%3e%3c/line%3e%3cline x1='3' y1='10' x2='21' y2='10'%3e%3c/line%3e%3c/svg%3e");
                      background-size: 18px;
                      opacity: 0.8;
                      cursor: pointer;
                    }
                    input[type="date"]::-webkit-calendar-picker-indicator:hover {
                      opacity: 1;
                    }
                    @media (prefers-color-scheme: dark) {
                      input[type="date"]::-webkit-calendar-picker-indicator {
                        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237dd99a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3e%3c/rect%3e%3cline x1='16' y1='2' x2='16' y2='6'%3e%3c/line%3e%3cline x1='8' y1='2' x2='8' y2='6'%3e%3c/line%3e%3cline x1='3' y1='10' x2='21' y2='10'%3e%3c/line%3e%3c/svg%3e");
                      }
                    }
                  `
                }} />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-m3-on-surface-variant mb-2 ml-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ colorScheme: 'light dark' }}
                    className="w-full px-4 py-3 bg-m3-surface-container text-m3-on-surface rounded-2xl outline-none border-2 border-m3-outline-variant/30 focus:border-m3-primary/50 transition-all font-medium"
                  />
                </div>
                
                <div className="flex items-center justify-end gap-2 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={goToSelectedDate}
                    className="px-8 py-2.5 bg-m3-primary text-m3-on-primary rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Go to Date
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {editingDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) cancelEdit();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-m3-surface-container-high/95 backdrop-blur-xl rounded-[28px] p-6 md:p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-m3-on-surface tracking-tight">
                  {format(new Date(editingDay.date), 'EEEE, MMM d')}
                </h3>
              </div>
              
              <form onSubmit={handleEditDay} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-m3-on-surface-variant mb-2 ml-1">
                    Lunch
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={lunchMealName}
                      onChange={e => setLunchMealName(e.target.value)}
                      autoCapitalize="words"
                      className="w-full px-4 py-3 pr-12 bg-m3-surface-container rounded-2xl outline-none border-2 border-m3-outline-variant/30 focus:border-m3-primary/50 transition-all font-medium leading-tight capitalize md:normal-case"
                    />
                    {lunchMealName && (
                      <button
                        type="button"
                        onClick={() => setLunchMealName('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-m3-on-surface-variant/60 hover:text-m3-on-surface hover:bg-m3-surface-variant/20 transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-m3-on-surface-variant mb-2 ml-1">
                    Dinner
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dinnerMealName}
                      onChange={e => setDinnerMealName(e.target.value)}
                      autoCapitalize="words"
                      className="w-full px-4 py-3 pr-12 bg-m3-surface-container rounded-2xl outline-none border-2 border-m3-outline-variant/30 focus:border-m3-primary/50 transition-all font-medium leading-tight capitalize md:normal-case"
                    />
                    {dinnerMealName && (
                      <button
                        type="button"
                        onClick={() => setDinnerMealName('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-m3-on-surface-variant/60 hover:text-m3-on-surface hover:bg-m3-surface-variant/20 transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-8">
                  {(editingDay.lunch || editingDay.dinner) && (
                    <button
                      type="button"
                      onClick={handleDeleteDay}
                      className="px-4 py-2.5 rounded-full font-semibold text-sm text-m3-error hover:bg-m3-error/8 transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={cancelEdit}
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
              </form>
            </motion.div>
          </motion.div>
        )}
        

      </AnimatePresence>
    </div>
  );
});
