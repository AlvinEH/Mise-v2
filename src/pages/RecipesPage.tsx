import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, ArrowUpDown, ChevronDown, ChevronUp, X, SlidersHorizontal, Clock, History, ArrowDownAZ, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HeaderSearchBar } from '../components/ui/HeaderSearchBar';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { FABMenu } from '../components/ui/FABMenu';
import { Recipe } from '../types';
import { useDebounce } from '../hooks';

export const RecipesPage = React.memo(({
  recipes,
  onEdit,
  onDelete
}: { 
  recipes: Recipe[], 
  onEdit: (r: Recipe) => void, 
  onDelete: (r: Recipe) => void 
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('alpha');

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const sortOptions = [
    { id: 'alpha', label: 'Alphabetical', icon: <ArrowDownAZ size={20} /> },
    { id: 'newest', label: 'Newest First', icon: <Clock size={20} /> },
    { id: 'oldest', label: 'Oldest First', icon: <History size={20} /> }
  ];

  const currentSort = sortOptions.find(o => o.id === sortBy);

  const sortedAndFilteredRecipes = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
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
    const lowerQuery = debouncedSearchQuery.toLowerCase();
    let filtered = recipes.filter(recipe => {
      const searchInIngredients = (recipe.ingredients || []).some(ing => 
        typeof ing === 'string' 
          ? ing.toLowerCase().includes(lowerQuery)
          : ing.name.toLowerCase().includes(lowerQuery)
      );

      const searchInSections = (recipe.ingredientSections || []).some(section => 
        (section.title || '').toLowerCase().includes(lowerQuery) ||
        section.items.some(ing => 
          typeof ing === 'string'
            ? (ing as string).toLowerCase().includes(lowerQuery)
            : ing.name.toLowerCase().includes(lowerQuery)
        )
      );

      return recipe.title.toLowerCase().includes(lowerQuery) ||
        (recipe.instructions && recipe.instructions.toLowerCase().includes(lowerQuery)) ||
        searchInIngredients ||
        searchInSections;
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
  }, [recipes, debouncedSearchQuery, sortBy]);

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'alpha': default: return 'Alphabetical';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <PageHeader 
        title={isSearchExpanded ? "" : "Recipe Library"} 
        actions={
          <>
            <HeaderSearchBar
              isExpanded={isSearchExpanded}
              onExpandChange={setIsSearchExpanded}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              placeholder="Search Recipes"
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
                        setIsSortModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-3 text-sm font-bold text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary rounded-xl transition-colors text-left"
                    >
                      <ArrowUpDown size={18} className="text-m3-primary/60" />
                      Sort Recipes
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
          {/* Active Search Indicator */}
          {searchQuery && (
            <div className="mb-6 flex items-center justify-between bg-m3-primary/5 px-4 py-2 rounded-xl border border-m3-primary/10">
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

          <section className="">
            {sortedAndFilteredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                <AnimatePresence mode="popLayout">
                  {sortedAndFilteredRecipes.map((recipe, index) => (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ 
                        duration: 0.4,
                        delay: index * 0.05,
                        layout: { duration: 0.3 }
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
      <div className="absolute bottom-6 right-6 z-40">
        <FABMenu onNavigate={navigate} />
      </div>

      {/* Sort Modal */}
      <AnimatePresence>
        {isSortModalOpen && (
          <motion.div
            key="sort-order-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSortModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-sm bg-m3-surface rounded-[32px] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-m3-outline/5 bg-m3-surface-container-low">
                <h2 className="text-xl font-black text-m3-on-surface">Sort Recipes By</h2>
                <button 
                  onClick={() => setIsSortModalOpen(false)}
                  className="p-2 hover:bg-m3-surface-variant/20 rounded-full transition-colors text-m3-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Options */}
              <div className="p-4 flex flex-col gap-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSortBy(option.id as any);
                      setIsSortModalOpen(false);
                    }}
                    className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all text-left font-bold ${
                      sortBy === option.id
                        ? 'bg-m3-primary text-m3-on-primary shadow-md'
                        : 'text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary'
                    }`}
                  >
                    <div className={sortBy === option.id ? 'text-m3-on-primary' : 'text-m3-primary/60'}>
                      {option.icon}
                    </div>
                    <span className="text-base">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 bg-m3-surface-container-low/30 flex justify-center">
                 <p className="text-[10px] font-bold text-m3-on-surface-variant/40 uppercase tracking-widest text-center">
                   Changes apply to current view
                 </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});