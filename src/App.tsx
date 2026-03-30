import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn } from 'lucide-react';

// Components
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Sidebar } from './components/layout/Sidebar';
import { AppRoutes } from './components/routing/AppRoutes';

// Hooks
import { useAuth, useTheme, useRecipes } from './hooks';

// Services
import { signIn, logOut } from './firebase';

// --- Delete Modal Component ---
const DeleteModal = ({ recipe, onCancel, onDelete }: { 
  recipe: any, 
  onCancel: () => void, 
  onDelete: (id: string) => void 
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
    onClick={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-m3-surface rounded-[32px] p-8 max-w-md w-full shadow-2xl"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-m3-on-surface">Delete Recipe?</h3>
        <p className="text-m3-on-surface-variant font-medium">
          Are you sure you want to delete <span className="font-bold text-m3-on-surface">"{recipe.title}"</span>? This action cannot be undone.
        </p>
      </div>
      <div className="flex gap-4 pt-4">
        <button 
          onClick={onCancel}
          className="flex-[0.4] py-2.5 px-6 border border-m3-outline text-m3-primary rounded-[20px] font-medium hover:bg-m3-primary/8 transition-all"
        >
          Cancel
        </button>
        <button 
          onClick={() => onDelete(recipe.id)}
          className="flex-[0.6] py-2.5 px-6 bg-m3-error text-m3-on-error rounded-[20px] font-medium hover:bg-m3-error/90 shadow-sm hover:shadow-md transition-all"
        >
          Delete
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// --- Main App Component ---
function App() {
  const { user, isAuthReady } = useAuth();
  const { theme, setTheme, mode, setMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    recipes,
    recipeToDelete,
    setRecipeToDelete,
    sortBy,
    setSortBy,
    handleDelete
  } = useRecipes(user);

  // Close dropdowns and modals when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (isSortDropdownOpen && !(event.target as Element).closest('.sort-dropdown')) {
      setIsSortDropdownOpen(false);
    }
    if (showFilterModal && !(event.target as Element).closest('.filter-modal')) {
      setShowFilterModal(false);
    }
  }, [isSortDropdownOpen, showFilterModal]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Determine if we should hide the sidebar based on current route
  const isRecipeDetailPage = location.pathname.startsWith('/recipe/') || 
                            location.pathname === '/add-recipe' || 
                            location.pathname.startsWith('/edit-recipe/');

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-m3-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-m3-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-m3-surface p-4">
        <div className="bg-m3-surface-container p-12 rounded-[48px] shadow-xl max-w-md text-center">
          <div className="w-20 h-20 bg-m3-primary text-m3-on-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <LogIn size={40} />
          </div>
          <h2 className="text-3xl font-bold text-m3-on-surface mb-4">Welcome to Mise</h2>
          <p className="text-m3-on-surface-variant mb-8 text-lg">
            Your personal recipe collection and kitchen companion.
          </p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-m3-primary text-m3-on-primary rounded-2xl font-bold hover:bg-m3-primary/90 text-lg shadow-lg transition-all"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-m3-surface">
      {/* Sidebar */}
      {!isRecipeDetailPage && (
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <AppRoutes
          user={user}
          recipes={recipes}
          onEdit={(recipe) => navigate(`/edit-recipe/${recipe.id}`)}
          onDelete={setRecipeToDelete}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          isSortDropdownOpen={isSortDropdownOpen}
          setIsSortDropdownOpen={setIsSortDropdownOpen}
          showFilterModal={showFilterModal}
          setShowFilterModal={setShowFilterModal}
          setIsSidebarOpen={setIsSidebarOpen}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          onLogout={logOut}
        />
      </div>

      {/* Delete Recipe Modal */}
      <AnimatePresence>
        {recipeToDelete && (
          <DeleteModal
            recipe={recipeToDelete}
            onCancel={() => setRecipeToDelete(null)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && !isRecipeDetailPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- App Wrapper with Error Boundary ---
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
