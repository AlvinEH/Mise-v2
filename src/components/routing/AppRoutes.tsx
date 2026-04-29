import React, { memo, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';

// Types
import { Recipe, Theme, Mode, CheckboxStyle } from '../../types';

// Lazy loaded pages
const HomePage = lazy(() => import('../../pages/HomePage').then(m => ({ default: m.HomePage })));
const RecipesPage = lazy(() => import('../../pages/RecipesPage').then(m => ({ default: m.RecipesPage })));
const RecipePage = lazy(() => import('../../pages/RecipePage').then(m => ({ default: m.RecipePage })));
const AddRecipePage = lazy(() => import('../../pages/AddRecipePage').then(m => ({ default: m.AddRecipePage })));
const InventoryPage = lazy(() => import('../../pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const ShoppingListPage = lazy(() => import('../../pages/ShoppingListPage').then(m => ({ default: m.ShoppingListPage })));
const MealPlannerPage = lazy(() => import('../../pages/MealPlannerPage').then(m => ({ default: m.MealPlannerPage })));
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

interface AppRoutesProps {
  user: User | null;
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
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
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' as const }
};

const LoadingPage = () => (
  <div className="flex-1 flex items-center justify-center p-8 bg-m3-surface">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-m3-primary border-t-transparent"></div>
  </div>
);

export const AppRoutes: React.FC<AppRoutesProps> = memo((
  {
    user,
    recipes,
    onEdit,
    onDelete,
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
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={
          <motion.div key="home" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <HomePage />
          </motion.div>
        } />
        
        <Route path="/recipes" element={
          <motion.div key="recipes" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <RecipesPage
              recipes={recipes}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </motion.div>
        } />
        
        <Route path="/recipe/:id" element={
          <motion.div key="recipe-detail" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <RecipePage recipes={recipes} onEdit={onEdit} onDelete={onDelete} checkboxStyle={checkboxStyle} />
          </motion.div>
        } />
        
        <Route path="/add-recipe" element={
          <motion.div key="add-recipe" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <AddRecipePage user={user} />
          </motion.div>
        } />

        <Route path="/edit-recipe/:id" element={
          <motion.div key="edit-recipe" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <AddRecipePage user={user} />
          </motion.div>
        } />
        
        <Route path="/inventory" element={
          <motion.div key="inventory" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <InventoryPage 
              user={user!}
              checkboxStyle={checkboxStyle}
            />
          </motion.div>
        } />
        
        <Route path="/shopping-list" element={
          <motion.div key="shopping-list" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <ShoppingListPage 
              user={user!} 
              checkboxStyle={checkboxStyle}
              aiAutoSort={aiAutoSort}
            />
          </motion.div>
        } />
        
        <Route path="/meal-planner" element={
          <motion.div key="meal-planner" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <MealPlannerPage />
          </motion.div>
        } />
        
        <Route path="/settings" element={
          <motion.div key="settings" {...pageTransition} className="relative flex-1 flex flex-col min-h-0">
            <SettingsPage 
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
    </Suspense>
  );
});
