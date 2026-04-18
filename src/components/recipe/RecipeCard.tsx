import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Edit2 } from 'lucide-react';
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
      className="bg-m3-surface-variant/20 rounded-[24px] border border-m3-outline/10 overflow-hidden cursor-pointer group transition-colors hover:bg-m3-surface-variant/40"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-bold text-base text-m3-on-surface line-clamp-2 leading-tight group-hover:text-m3-primary transition-colors">{recipe.title}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/edit-recipe/${recipe.id}`);
            }}
            className="p-2 -mr-1 -mt-1 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
            title="Edit Recipe"
          >
            <Edit2 size={16} />
          </button>
        </div>
        {recipe.servings && (
          <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
            <Users size={12} />
            <span className="truncate">
              {recipe.servings.toLowerCase().startsWith('serves') ? recipe.servings : `Serves ${recipe.servings}`}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});