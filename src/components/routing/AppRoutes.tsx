import React, { memo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';

// Pages
import { HomePage } from '../../pages/HomePage';
import { RecipesPage } from '../../pages/RecipesPage';
import { RecipePage } from '../../pages/RecipePage';
import { AddRecipePage } from '../../pages/AddRecipePage';
import { InventoryPage } from '../../pages/InventoryPage';
import { ShoppingListPage } from '../../pages/ShoppingListPage';
import { MealPlannerPage } from '../../pages/MealPlannerPage';
import { SettingsPage } from '../../pages/SettingsPage';

// Types
import { Recipe, Theme, Mode, CheckboxStyle } from '../../types';

interface AppRoutesProps {
  user: User | null;
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'newest' | 'oldest' | 'alpha';
  setSortBy: (sort: 'newest' | 'oldest' | 'alpha') => void;
  isSortModalOpen: boolean;
  setIsSortModalOpen: (open: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  checkboxStyle: CheckboxStyle;
  setCheckboxStyle: (style: CheckboxStyle) => void;
  aiAutoSort: boolean;
  setAiAutoSort: (value: boolean) => void;
  onLogout: () => void;
}

const pageTransition = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 10, opacity: 0 },
  transition: { duration: 0.2, ease: 'easeOut' as const }
};

export const AppRoutes: React.FC<AppRoutesProps> = memo((
  {
    user,
    recipes,
    onEdit,
    onDelete,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    isSortModalOpen,
    setIsSortModalOpen,
    setIsSidebarOpen,
    theme,
    setTheme,
    mode,
    setMode,
    checkboxStyle,
    setCheckboxStyle,
    aiAutoSort,
    setAiAutoSort,
    onLogout
  }
) => {
  return (
    <Routes>
      <Route path="/" element={
        <motion.div key="home" {...pageTransition} className="flex-1 flex flex-col min-h-0">
          <HomePage onMenuClick={() => setIsSidebarOpen(true)} />
        </motion.div>
      } />
      
      <Route path="/recipes" element={
        <motion.div key="recipes" {...pageTransition} className="flex-1 flex flex-col min-h-0">
          <RecipesPage
            onMenuClick={() => setIsSidebarOpen(true)}
            recipes={recipes}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isSortModalOpen={isSortModalOpen}
            setIsSortModalOpen={setIsSortModalOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </motion.div>
      } />
      
      <Route path="/recipe/:id" element={
        <motion.div key="recipe-detail" {...pageTransition}>
          <RecipePage recipes={recipes} onEdit={onEdit} onDelete={onDelete} />
        </motion.div>
      } />
      
      <Route path="/add-recipe" element={
        <motion.div key="add-recipe" {...pageTransition}>
          <AddRecipePage user={user} onMenuClick={() => setIsSidebarOpen(true)} />
        </motion.div>
      } />

      <Route path="/edit-recipe/:id" element={
        <motion.div key="edit-recipe" {...pageTransition}>
          <AddRecipePage user={user} onMenuClick={() => setIsSidebarOpen(true)} />
        </motion.div>
      } />
      
      <Route path="/inventory" element={
        <motion.div key="inventory" {...pageTransition} className="flex-1 flex flex-col min-h-0">
          <InventoryPage 
            onMenuClick={() => setIsSidebarOpen(true)} 
            user={user!}
            checkboxStyle={checkboxStyle}
          />
        </motion.div>
      } />
      
      <Route path="/shopping-list" element={
        <motion.div key="shopping-list" {...pageTransition} className="flex-1 flex flex-col min-h-0">
          <ShoppingListPage 
            onMenuClick={() => setIsSidebarOpen(true)} 
            user={user!} 
            checkboxStyle={checkboxStyle}
            aiAutoSort={aiAutoSort}
          />
        </motion.div>
      } />
      
      <Route path="/meal-planner" element={
        <motion.div key="meal-planner" {...pageTransition} className="flex-1 flex flex-col min-h-0">
          <MealPlannerPage onMenuClick={() => setIsSidebarOpen(true)} />
        </motion.div>
      } />
      
      <Route path="/settings" element={
        <motion.div key="settings" {...pageTransition} className="flex-1 flex flex-col min-h-0">
          <SettingsPage 
            onMenuClick={() => setIsSidebarOpen(true)} 
            theme={theme}
            setTheme={setTheme}
            mode={mode}
            setMode={setMode}
            checkboxStyle={checkboxStyle}
            setCheckboxStyle={setCheckboxStyle}
            aiAutoSort={aiAutoSort}
            setAiAutoSort={setAiAutoSort}
            user={user}
            onLogout={onLogout}
          />
        </motion.div>
      } />
    </Routes>
  );
});
