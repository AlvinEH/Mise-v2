import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Search, ArrowUpDown, ChevronDown, ChevronUp, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { FABMenu } from '../components/ui/FABMenu';
import { Recipe } from '../types';

interface RecipesPageProps {
  onMenuClick: () => void;
  recipes: Recipe[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'newest' | 'oldest' | 'alpha';
  setSortBy: (sort: 'newest' | 'oldest' | 'alpha') => void;
  isSortModalOpen: boolean;
  setIsSortModalOpen: (open: boolean) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}

export const RecipesPage = React.memo(({
  onMenuClick,
  recipes,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  isSortModalOpen,
  setIsSortModalOpen,
  onEdit,
  onDelete
}: RecipesPageProps) => {
  const navigate = useNavigate();
  const [isInternalDropdownOpen, setIsInternalDropdownOpen] = useState(false);

  const sortOptions = [
    { id: 'alpha', label: 'Alphabetical' },
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' }
  ];

  const currentSort = sortOptions.find(o => o.id === sortBy);

  const sortedAndFilteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) {
      // No filtering needed, just sort
      const recipesToSort = [...recipes];
      switch (sortBy) {
        case 'newest':
          return recipesToSort.sort((a, b) => {
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            return bTime - aTime;
          });
        case 'oldest':
          return recipesToSort.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return aTime - bTime;
          });
        case 'alpha':
        default:
          return recipesToSort.sort((a, b) => a.title.localeCompare(b.title));
      }
    }

    // Filter with search query
    const lowerQuery = searchQuery.toLowerCase();
    let filtered = recipes.filter(recipe => {
      return recipe.title.toLowerCase().includes(lowerQuery) ||
        recipe.instructions?.toLowerCase().includes(lowerQuery) ||
        (recipe.ingredients && recipe.ingredients.some(ing => 
          typeof ing === 'string' 
            ? ing.toLowerCase().includes(lowerQuery)
            : ing.name.toLowerCase().includes(lowerQuery)
        ));
    });

    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => {
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          return bTime - aTime;
        });
      case 'oldest':
        return filtered.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return aTime - bTime;
        });
      case 'alpha':
      default:
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [recipes, searchQuery, sortBy]);

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'alpha': default: return 'Alphabetical';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
      <PageHeader 
        title="Recipe Library" 
        onMenuClick={onMenuClick} 
        actions={
          <button
            onClick={() => setIsSortModalOpen(true)}
            className={`p-2 rounded-full transition-all ${
              sortBy !== 'alpha' 
                ? 'text-m3-primary bg-m3-primary/10' 
                : 'text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10'
            }`}
            title="Sort recipes"
          >
            <ArrowUpDown size={20} />
          </button>
        }
      />
      
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-10">
          <div className="sticky top-0 z-20 bg-m3-surface pt-6 pb-4 sm:pt-10 sm:pb-6">
            <div className="relative group max-w-4xl mx-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/50 transition-colors group-focus-within:text-m3-primary">
                <Search size={24} />
              </div>
              <input
                type="text"
                placeholder="Search recipes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-14 bg-m3-surface-container-low text-m3-on-surface placeholder:text-m3-on-surface-variant/40 rounded-full outline-none focus:ring-2 focus:ring-m3-primary/20 transition-all font-bold text-base shadow-sm hover:shadow-md focus:shadow-md"
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

          <section className="pb-10">
            {sortedAndFilteredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                <AnimatePresence mode="popLayout">
                  {sortedAndFilteredRecipes.map((recipe, index) => (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ 
                        layout: { duration: 0.3 },
                        opacity: { duration: 0.2 }
                      }}
                    >
                      <RecipeCard
                        recipe={recipe}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-32 bg-m3-surface-variant/10 rounded-[48px] border-2 border-dashed border-m3-outline/20">
                <div className="w-24 h-24 bg-m3-surface-variant/30 text-m3-on-surface-variant/40 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Search size={48} />
                </div>
                <h3 className="text-3xl font-bold text-m3-on-surface mb-3">No recipes found</h3>
                <p className="text-m3-on-surface-variant text-lg font-medium">
                  {searchQuery ? "Try a different search term" : "Start by adding your first recipe!"}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
        <FABMenu onNavigate={navigate} />
      </div>

      {/* Sort Modal */}
      <AnimatePresence>
        {isSortModalOpen && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsSortModalOpen(false);
                setIsInternalDropdownOpen(false);
              }}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="sort-modal w-full max-w-sm bg-m3-surface rounded-[32px] shadow-2xl border border-m3-outline/10 p-6 overflow-visible"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-m3-on-surface">Sort Recipes</h2>
                <button 
                  onClick={() => {
                    setIsSortModalOpen(false);
                    setIsInternalDropdownOpen(false);
                  }}
                  className="p-2 hover:bg-m3-surface-variant/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black uppercase tracking-widest text-m3-on-surface-variant ml-1">Order By</label>
                <div className="relative">
                  <button
                    onClick={() => setIsInternalDropdownOpen(!isInternalDropdownOpen)}
                    className="w-full flex items-center justify-between p-4 bg-m3-surface-variant/10 hover:bg-m3-surface-variant/20 border border-m3-outline/10 rounded-[24px] transition-all"
                  >
                    <span className="font-black text-m3-on-surface">{currentSort?.label}</span>
                    <ChevronDown size={20} className={`text-m3-on-surface-variant transition-transform ${isInternalDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isInternalDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-xl z-20 overflow-hidden"
                      >
                        {sortOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id as any);
                              setIsInternalDropdownOpen(false);
                              setIsSortModalOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-4 hover:bg-m3-surface-variant/20 transition-all ${
                              sortBy === option.id ? 'bg-m3-primary/5' : ''
                            }`}
                          >
                            <span className={`font-black ${sortBy === option.id ? 'text-m3-primary' : 'text-m3-on-surface'}`}>
                              {option.label}
                            </span>
                            {sortBy === option.id && (
                              <div className="w-1.5 h-1.5 bg-m3-primary rounded-full" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});