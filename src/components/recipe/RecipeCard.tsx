import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users } from 'lucide-react';
import { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard = memo(({ recipe }: RecipeCardProps) => {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="bg-m3-surface-variant/20 rounded-[28px] border border-m3-outline/10 overflow-hidden cursor-pointer group transition-colors hover:bg-m3-surface-variant/40"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-xl text-m3-on-surface line-clamp-2 leading-tight">{recipe.title}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
          <Users size={14} />
          <span>
            {recipe.servings 
              ? (recipe.servings.toLowerCase().startsWith('serves') ? recipe.servings : `Serves ${recipe.servings}`)
              : 'Servings not set'}
          </span>
        </div>
      </div>
    </motion.div>
  );
});