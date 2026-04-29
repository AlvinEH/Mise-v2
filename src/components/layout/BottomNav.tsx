import React, { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingCart, Calendar, BookOpen, Package, Home, Settings } from 'lucide-react';

export const BottomNav = memo(() => {
  const location = useLocation();
  
  const menuItems = [
    { icon: BookOpen, label: 'Recipes', path: '/recipes' },
    { icon: Calendar, label: 'Planner', path: '/meal-planner' },
    { icon: ShoppingCart, label: 'Shopping', path: '/shopping-list' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="bg-m3-surface-container/95 backdrop-blur-md border-t border-m3-outline/10 px-2 pb-[env(safe-area-inset-bottom)] shrink-0">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              <div className="relative flex flex-col items-center justify-center h-8 w-16">
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-m3-primary rounded-full shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 33 }}
                  />
                )}
                <div className={`
                  relative z-10 flex items-center justify-center transition-colors duration-200
                  ${isActive 
                    ? 'text-m3-on-primary' 
                    : 'text-m3-on-surface-variant group-hover:text-m3-on-surface'}
                `}>
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});
