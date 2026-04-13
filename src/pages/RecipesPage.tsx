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
      <PageHeader 
        title="Recipe Library" 
        onMenuClick={onMenuClick} 
      />
      
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-10">
          {/* Pinned Search and Filter */}
          <div className="sticky top-0 z-20 bg-m3-surface pt-6 pb-4 sm:pt-10 sm:pb-6">
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant">
                  <Search size={24} />
                </div>
                <input
                  type="text"
                  placeholder="Search recipes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 sm:pl-14 sm:pr-14 bg-m3-surface-container-high text-m3-on-surface placeholder:text-m3-on-surface-variant/60 rounded-full outline-none focus:ring-2 focus:ring-m3-primary/20 transition-all font-medium text-base sm:text-lg"
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
              
              <button
                onClick={() => setShowFilterModal(true)}
                className={`relative h-14 w-14 flex items-center justify-center rounded-full transition-all ${
                  searchQuery || sortBy !== 'alpha' 
                    ? 'bg-m3-primary-container text-m3-on-primary-container shadow-md' 
                    : 'bg-m3-surface-container-high text-m3-on-surface-variant hover:bg-m3-surface-container-highest'
                }`}
                title="Sort recipes"
              >
                <ArrowUpDown size={24} />
                {(searchQuery || sortBy !== 'alpha') && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-m3-primary rounded-full border-2 border-m3-primary-container" />
                )}
              </button>
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="filter-modal bg-m3-surface-container-high rounded-[28px] w-full max-w-sm p-6 space-y-6 shadow-2xl border border-m3-outline/5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-medium text-m3-on-surface">Sort</h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'alpha', label: 'Alphabetical' },
                    { id: 'newest', label: 'Newest First' },
                    { id: 'oldest', label: 'Oldest First' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortBy(option.id as any);
                        setShowFilterModal(false);
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                        sortBy === option.id 
                          ? 'bg-m3-secondary-container text-m3-on-secondary-container font-bold' 
                          : 'bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-highest'
                      }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.id && (
                        <div className="w-2 h-2 bg-m3-primary rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});