import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Search, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
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
  isSortDropdownOpen: boolean;
  setIsSortDropdownOpen: (open: boolean) => void;
  showFilterModal: boolean;
  setShowFilterModal: (show: boolean) => void;
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
  isSortDropdownOpen,
  setIsSortDropdownOpen,
  showFilterModal,
  setShowFilterModal,
  onEdit,
  onDelete
}: RecipesPageProps) => {
  const navigate = useNavigate();

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
      <PageHeader title="Recipe Library" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 min-h-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 lg:mb-12">
            <h2 className="text-4xl font-black text-m3-on-surface tracking-tight mb-2">Recipe Library</h2>
            <p className="text-m3-on-surface-variant font-medium">Discover and organize your favorite recipes.</p>
          </div>

          <div className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-m3-on-surface-variant/60" size={20} />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
              />
            </div>
            
            <button
              onClick={() => setShowFilterModal(true)}
              className={`relative p-3 rounded-2xl transition-all border border-m3-outline/20 ${
                searchQuery || sortBy !== 'alpha' ? 'text-m3-primary bg-m3-primary/10' : 'text-m3-on-surface-variant bg-m3-surface-variant/20'
              }`}
              title="Filter and sort recipes"
            >
              <Filter size={20} />
              {(searchQuery || sortBy !== 'alpha') && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-m3-primary rounded-full" />
              )}
            </button>
          </div>

          <section>
            {sortedAndFilteredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-8">
                {sortedAndFilteredRecipes.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <RecipeCard
                      recipe={recipe}
                      onDelete={() => onDelete(recipe)}
                    />
                  </motion.div>
                ))}
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
      <div className="fixed bottom-6 right-6 z-40">
        <FABMenu onNavigate={navigate} />
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="filter-modal bg-m3-surface rounded-[32px] w-full max-w-md p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-m3-on-surface">Filter & Sort</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-m3-on-surface-variant hover:text-m3-primary rounded-full hover:bg-m3-primary/10 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black uppercase tracking-widest text-m3-on-surface-variant">Sort By</label>
                <div className="relative">
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="w-full flex items-center justify-between p-4 bg-m3-surface-variant/10 hover:bg-m3-surface-variant/20 border border-m3-outline/10 rounded-[24px] transition-all"
                  >
                    <span className="font-bold text-m3-on-surface">{getSortLabel(sortBy)}</span>
                    <ChevronDown size={20} className={`text-m3-on-surface-variant transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isSortDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-xl z-10 overflow-hidden">
                      {['alpha', 'newest', 'oldest'].map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option as 'newest' | 'oldest' | 'alpha');
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left p-4 hover:bg-m3-surface-variant/20 transition-all ${
                            sortBy === option ? 'bg-m3-primary/5 text-m3-primary font-bold' : 'text-m3-on-surface font-medium'
                          }`}
                        >
                          {getSortLabel(option)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSortBy('alpha');
                    setIsSortDropdownOpen(false);
                    setShowFilterModal(false);
                  }}
                  className="flex-1 py-3 px-6 border border-m3-outline text-m3-on-surface rounded-2xl font-bold hover:bg-m3-surface-variant/20 transition-all"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    setIsSortDropdownOpen(false);
                    setShowFilterModal(false);
                  }}
                  className="flex-1 py-3 px-6 bg-m3-primary text-m3-on-primary rounded-2xl font-bold hover:bg-m3-primary/90 transition-all"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});