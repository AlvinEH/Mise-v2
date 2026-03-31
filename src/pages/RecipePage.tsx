import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, ExternalLink, Pencil } from 'lucide-react';
import { Zzz } from '../components/ui/icons';
import { PageHeader } from '../components/layout/PageHeader';
import { Recipe } from '../types';

interface RecipePageProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}

export const RecipePage: React.FC<RecipePageProps> = ({ recipes, onEdit, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-m3-surface p-4">
        <h2 className="text-2xl font-bold text-m3-on-surface mb-4">Recipe not found</h2>
        <button 
          onClick={() => navigate('/recipes')}
          className="px-6 py-2 bg-m3-primary text-m3-on-primary rounded-xl font-semibold hover:bg-m3-primary/90 transition-colors"
        >
          Back to Recipes
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-m3-surface"
    >
      <PageHeader 
        title={recipe.title} 
        showBack 
        actions={
          <>
            <button 
              onClick={() => onEdit(recipe)}
              className="p-2 bg-m3-surface-variant/20 hover:bg-m3-surface-variant/30 text-m3-on-surface rounded-full transition-colors"
              title="Edit Recipe"
            >
              <Pencil size={20} />
            </button>
            <button 
              onClick={() => onDelete(recipe)}
              className="p-2 bg-m3-surface-variant/20 hover:bg-m3-surface-variant/30 text-red-600 rounded-full transition-colors"
              title="Delete Recipe"
            >
              <Trash2 size={20} />
            </button>
            {recipe.sourceUrl && (
              <a 
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-m3-surface-variant/20 hover:bg-m3-surface-variant/30 text-m3-on-surface rounded-full transition-colors"
                title="View Original"
              >
                <ExternalLink size={20} />
              </a>
            )}
          </>
        }
      />
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <div className="space-y-8">
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-m3-on-surface mb-4">Ingredients</h2>
            <div className="space-y-0.5">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center gap-3 py-1.5 px-3 hover:bg-m3-surface-variant/10 transition-colors rounded-xl group">
                  <div className="w-5 h-5 border-2 border-m3-outline/30 rounded-md flex-shrink-0 group-hover:border-m3-primary/50 transition-colors" />
                  <span className="text-m3-on-surface font-bold text-sm leading-tight">
                    {typeof ingredient === 'string' ? ingredient : `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recipe.instructions && (
          <div>
            <h2 className="text-2xl font-bold text-m3-on-surface mb-6">Instructions</h2>
            <div className="prose prose-lg max-w-none">
              <div className="text-m3-on-surface leading-relaxed whitespace-pre-wrap">
                {recipe.instructions}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>
    </motion.div>
  );
};