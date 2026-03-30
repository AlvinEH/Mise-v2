import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, ShoppingCart, Package, BookOpen } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

interface HomePageProps {
  onMenuClick: () => void;
}

export const HomePage = ({ onMenuClick }: HomePageProps) => {
  const pages = [
    {
      icon: Calendar,
      title: 'Meal Planner',
      description: 'Plan your meals for the week ahead',
      path: '/meal-planner',
      bgColor: 'bg-m3-primary-container',
      iconColor: 'text-m3-on-primary-container'
    },
    {
      icon: ShoppingCart,
      title: 'Shopping List',
      description: 'Organize your grocery shopping',
      path: '/shopping-list',
      bgColor: 'bg-m3-secondary-container',
      iconColor: 'text-m3-on-secondary-container'
    },
    {
      icon: Package,
      title: 'Inventory',
      description: 'Track your pantry and ingredients',
      path: '/inventory',
      bgColor: 'bg-m3-surface-variant',
      iconColor: 'text-m3-on-surface-variant'
    },
    {
      icon: BookOpen,
      title: 'Recipes',
      description: 'Browse and manage your recipes',
      path: '/recipes',
      bgColor: 'bg-m3-primary-container',
      iconColor: 'text-m3-on-primary-container'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-m3-surface">
      <PageHeader title="Home" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-m3-on-surface tracking-tight mb-3">
              Welcome to Mise
            </h1>
            <p className="text-lg text-m3-on-surface-variant">
              Your complete kitchen companion for meal planning, shopping, and cooking
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4 max-w-md">
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
                  className="group flex items-center gap-4 p-5 rounded-[28px] bg-m3-surface-container hover:bg-m3-surface-container-high border border-m3-outline/5 transition-all duration-300 hover:shadow-lg block"
                >
                  <div className={`flex-shrink-0 p-3.5 rounded-2xl ${page.bgColor} ${page.iconColor} transition-colors`}>
                    <page.icon size={24} strokeWidth={2.5} />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-m3-on-surface group-hover:text-m3-primary transition-colors tracking-tight">
                      {page.title}
                    </h3>
                    <p className="text-sm font-medium text-m3-on-surface-variant leading-tight">
                      {page.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};