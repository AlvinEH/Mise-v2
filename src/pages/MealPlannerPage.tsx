import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, UtensilsCrossed, Calendar as CalendarIcon, Trash2, X } from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfDay, isBefore, getDay } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
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

export const MealPlannerPage = ({ onMenuClick }: MealPlannerPageProps) => {
  const [user] = useAuthState(auth);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [editingDay, setEditingDay] = useState<{ date: string; lunch?: MealEntry; dinner?: MealEntry } | null>(null);
  const [lunchMealName, setLunchMealName] = useState('');
  const [dinnerMealName, setDinnerMealName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  // Calculate next Friday
  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = getDay(today); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
    return addDays(startOfDay(today), daysUntilFriday);
  };

  const [dateRange, setDateRange] = useState(() => {
    const today = startOfDay(new Date());
    const nextFriday = getNextFriday();
    
    // Show 3 weeks: 1 week before + current week + next week
    return {
      start: subDays(today, 14),
      end: addDays(nextFriday, 7)
    };
  });
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Infinite scroll for seamless content loading
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isLoadingRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Load more past dates when scrolling near top (within 300px)
      if (scrollTop < 300) {
        isLoadingRef.current = true;
        setDateRange(prev => ({
          ...prev,
          start: subDays(prev.start, 7)
        }));
        setTimeout(() => { isLoadingRef.current = false; }, 500);
      }
      
      // Load more future dates when scrolling near bottom (within 300px)
      if (scrollTop + clientHeight > scrollHeight - 300) {
        isLoadingRef.current = true;
        setDateRange(prev => ({
          ...prev,
          end: addDays(prev.end, 7)
        }));
        setTimeout(() => { isLoadingRef.current = false; }, 500);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Scroll to today on initial load and when meals are loaded
  useEffect(() => {
    if (todayRef.current && meals.length > 0) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }, [meals.length > 0]); 

  // Always scroll to today when component mounts (page entry)
  useEffect(() => {
    const scrollToTodayOnMount = () => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(scrollToTodayOnMount, 300);
    return () => clearTimeout(timer);
  }, []);



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

  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };



  const goToToday = () => {
    scrollToToday();
  };



  const handleDatePicker = () => {
    setShowDatePicker(true);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const goToSelectedDate = () => {
    if (!selectedDate) return;
    const targetDate = new Date(selectedDate);
    
    // Extend date range if needed to include the selected date
    setDateRange(prev => ({
      start: targetDate < prev.start ? subDays(targetDate, 7) : prev.start,
      end: targetDate > prev.end ? addDays(targetDate, 7) : prev.end
    }));
    
    setShowDatePicker(false);
    
    // Scroll to the date after a short delay to ensure it's rendered
    setTimeout(() => {
      const dateElement = document.querySelector(`[data-date="${format(targetDate, 'yyyy-MM-dd')}"]`);
      if (dateElement) {
        dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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
      <PageHeader title="Meal Planner" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Page Header */}
        <div className="px-6 pt-1 pb-0 bg-m3-surface">
          <div className="max-w-7xl mx-auto">
            <div>
              <h2 className="text-4xl font-black text-m3-on-surface tracking-tight mb-0">Meal Planner</h2>
            </div>
          </div>
        </div>
        
        {/* Navigation Controls */}
        <div className="px-6 py-4 bg-m3-surface z-10 border-b border-m3-outline-variant/20">
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={handleDatePicker}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-m3-surface-container text-m3-on-surface font-medium text-sm hover:shadow-md transition-all active:scale-95"
            >
              <CalendarIcon size={18} className="text-m3-primary" />
              Pick Date
            </button>
            <button 
              onClick={goToToday}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-medium text-sm hover:shadow-md transition-all active:scale-95"
            >
              <CalendarIcon size={18} className="text-m3-on-primary" />
              Today
            </button>
          </div>
        </div>

        {/* Scrolling Agenda View */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="max-w-4xl mx-auto py-6 md:py-12 px-4 md:px-6">
            <div className="space-y-3 md:space-y-4">
              {days.map((date, index) => {
                const dateString = format(date, 'yyyy-MM-dd');
                const dayMeals = mealsByDate[dateString] || {};
                const isToday = isSameDay(date, new Date());
                const isPast = isBefore(date, startOfDay(new Date()));
                const hasNoMeals = !dayMeals.lunch && !dayMeals.dinner;
                const shouldCompact = isPast && hasNoMeals;
                
                return (
                  <motion.div
                    key={dateString}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={!shouldCompact ? { y: -2, scale: 1.01 } : {}}
                    whileTap={!shouldCompact ? { y: -4, scale: 0.99 } : {}}
                  >
                    <div 
                      ref={isToday ? todayRef : null}
                      data-date={dateString}
                      onClick={() => !shouldCompact && startEditingDay(dateString, dayMeals)}
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
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold tracking-wide text-m3-on-primary-container/60`}>LUNCH</span>
                        </div>
                        
                        {dayMeals.lunch ? (
                          <div className={`relative p-1 rounded-xl text-m3-on-primary-container`}>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm leading-tight mb-0.5 truncate">
                                {dayMeals.lunch.recipeName}
                              </h4>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-full py-2 text-[10px] font-medium italic transition-all text-m3-on-primary-container/40 ${isPast ? 'opacity-50' : ''}`}>
                            No lunch planned
                          </div>
                        )}
                      </div>

                      {/* Dinner Slot */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold tracking-wide text-m3-on-primary-container/60`}>DINNER</span>
                        </div>
                        
                        {dayMeals.dinner ? (
                          <div className={`relative p-1 rounded-xl text-m3-on-primary-container`}>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm leading-tight mb-0.5 truncate">
                                {dayMeals.dinner.recipeName}
                              </h4>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-full py-2 text-[10px] font-medium italic transition-all text-m3-on-primary-container/40 ${isPast ? 'opacity-50' : ''}`}>
                            No dinner planned
                          </div>
                        )}
                      </div>
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
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-m3-surface/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDatePicker(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-m3-surface-container-high rounded-[28px] p-6 md:p-8 w-full max-w-sm shadow-xl border border-m3-outline-variant/20"
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
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="flex-1 px-6 py-2.5 rounded-full font-medium text-sm text-m3-primary hover:bg-m3-primary/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={goToSelectedDate}
                    className="flex-1 px-6 py-2.5 bg-m3-primary text-m3-on-primary rounded-full font-medium text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
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
            className="fixed inset-0 bg-m3-surface/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) cancelEdit();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-m3-surface-container-high rounded-[28px] p-6 md:p-8 w-full max-w-lg shadow-xl border border-m3-outline-variant/20"
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
                
                <div className="flex gap-3 pt-4">
                  {(editingDay.lunch || editingDay.dinner) && (
                    <button
                      type="button"
                      onClick={handleDeleteDay}
                      className="px-4 py-2.5 rounded-full font-medium text-sm text-m3-error hover:bg-m3-error/5 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-[0.4] py-2.5 px-6 border border-m3-outline text-m3-primary rounded-[20px] font-medium hover:bg-m3-primary/8 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[0.6] py-2.5 px-6 bg-m3-primary text-m3-on-primary rounded-[20px] font-medium hover:bg-m3-primary/90 shadow-sm hover:shadow-md transition-all"
                  >
                    Save Day
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        

      </AnimatePresence>
    </div>
  );
};
