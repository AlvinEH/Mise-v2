import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Edit2, Trash2, Clock } from 'lucide-react';
import { Recipe } from '../../types';
import { formatIngredient } from '../../utils';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete: (e: React.MouseEvent) => void;
}

export const RecipeCard = memo(({ recipe, onDelete }: RecipeCardProps) => {
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
          <div className="flex gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
              className="p-2 text-m3-on-surface-variant hover:text-red-600 hover:bg-red-50 transition-colors rounded-full"
              title="Delete Recipe"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
          <Clock size={14} />
          <span>{recipe.createdAt.toDate().toLocaleDateString()}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.ingredients.slice(0, 3).map((ing, i) => (
            <span key={i} className="px-3 py-1 bg-m3-secondary-container text-m3-on-secondary-container text-xs font-medium rounded-lg">
              {formatIngredient(ing).slice(0, 25)}
            </span>
          ))}
          {recipe.ingredients.length > 3 && (
            <span className="px-2 py-1 text-m3-on-surface-variant text-xs">+{recipe.ingredients.length - 3} more</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});