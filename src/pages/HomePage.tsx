import React, { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, ShoppingCart, Package, BookOpen, Settings } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

export const HomePage = memo(() => {
  const navigate = useNavigate();
  const pages = [
    {
      icon: Calendar,
      title: 'Meal Planner',
      path: '/meal-planner',
      bgColor: 'bg-m3-primary',
      iconColor: 'text-m3-on-primary'
    },
    {
      icon: ShoppingCart,
      title: 'Shopping List',
      path: '/shopping-list',
      bgColor: 'bg-m3-secondary',
      iconColor: 'text-m3-on-secondary'
    },
    {
      icon: Package,
      title: 'Inventory',
      path: '/inventory',
      bgColor: 'bg-m3-tertiary',
      iconColor: 'text-m3-on-tertiary'
    },
    {
      icon: BookOpen,
      title: 'Recipes',
      path: '/recipes',
      bgColor: 'bg-m3-primary-container',
      iconColor: 'text-m3-on-primary-container'
    }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-m3-surface">
      <PageHeader 
        title="Welcome to Mise" 
      />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Navigation Links */}
          <div className="space-y-3 max-w-sm">
            {pages.map((page, index) => (
              <motion.div
                key={page.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                whileTap={{ y: -2, scale: 0.98 }}
              >
                <Link
                  to={page.path}
                  className="group flex items-center gap-4 p-4 rounded-[24px] bg-m3-surface-variant hover:bg-m3-surface-container-high border border-m3-outline/5 transition-all duration-300 hover:shadow-md block"
                >
                  <div className={`flex-shrink-0 p-3 rounded-xl ${page.bgColor} ${page.iconColor} transition-colors`}>
                    <page.icon size={22} strokeWidth={2.5} />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-black text-m3-on-surface group-hover:text-m3-primary transition-colors tracking-tight">
                      {page.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
});