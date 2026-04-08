import React, { useState, useEffect, memo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Calendar, Settings, BookOpen, Package, Home } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = memo(({ isOpen, onClose }: SidebarProps) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Meal Planner', path: '/meal-planner' },
    { icon: ShoppingCart, label: 'Shopping List', path: '/shopping-list' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: BookOpen, label: 'Recipes', path: '/recipes' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 lg:hidden will-change-opacity"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: (isOpen || isDesktop) ? 0 : -280 }}
        transition={{ 
          duration: 0.3,
          ease: [0.2, 0, 0, 1]
        }}
        className={`fixed top-0 left-0 h-full w-[280px] bg-m3-surface border-r border-m3-outline/10 z-[60] lg:static lg:w-64 flex flex-col will-change-transform pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]`}
      >
        <div className="p-6 flex items-center justify-between border-b border-m3-outline/5">
          <div className="text-2xl font-black tracking-tight text-m3-on-surface">
            Mise
          </div>
          <NavLink
            to="/settings"
            onClick={() => onClose()}
            className={({ isActive }) => `
              p-2 rounded-full transition-all
              ${isActive 
                ? 'bg-m3-primary-container text-m3-on-primary-container' 
                : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30 hover:text-m3-on-surface'}
            `}
          >
            <Settings size={20} />
          </NavLink>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-[20px] font-bold transition-all
                ${isActive 
                  ? 'bg-m3-primary-container text-m3-on-primary-container shadow-sm' 
                  : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/30 hover:text-m3-on-surface'}
              `}
            >
              <item.icon size={24} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </motion.aside>
    </>
  );
});