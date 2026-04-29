import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard = memo(({ recipe }: RecipeCardProps) => {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="bg-m3-surface-variant/20 rounded-[24px] border border-m3-outline/10 overflow-hidden cursor-pointer group transition-all duration-300 hover:bg-m3-surface-variant/40"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-bold text-base text-m3-on-surface line-clamp-2 leading-tight group-hover:text-m3-primary transition-colors">{recipe.title}</h3>
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
    </div>
  );
});