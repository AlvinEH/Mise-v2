import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, ExternalLink, Pencil, Check, Users, Plus, Minus } from 'lucide-react';
import Markdown from 'react-markdown';
import { Zzz } from '../components/ui/icons';
import { PageHeader } from '../components/layout/PageHeader';
import { Recipe } from '../types';
import { evaluateFraction, formatAmount } from '../utils/shoppingItems';

interface RecipePageProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}

export const RecipePage: React.FC<RecipePageProps> = ({ recipes, onEdit, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = recipes.find(r => r.id === id);
  
  const extractServings = (servingsStr: string | undefined): number => {
    if (!servingsStr) return 1;
    const match = servingsStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const originalServings = extractServings(recipe?.servings);
  const [currentServings, setCurrentServings] = useState(originalServings);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (recipe) {
      setCurrentServings(extractServings(recipe.servings));
      setCheckedIngredients({});
    }
  }, [id, recipe?.servings]);

  const multiplier = currentServings / originalServings;

  const getScaledMeasurement = (amount: number, unit: string): string => {
    const normalizedUnit = unit.toLowerCase().trim();
    const integerPart = Math.floor(amount + 0.0001);
    const fractionalPart = amount - integerPart;
    const tolerance = 0.02;

    // Cup to Tbsp conversion for small fractions (< 1/4)
    if (['cup', 'cups', 'c.'].includes(normalizedUnit)) {
      if (fractionalPart > tolerance && fractionalPart < 0.25 - tolerance) {
        const tbspAmount = fractionalPart * 16;
        const formattedTbsp = formatAmount(tbspAmount);
        const cupUnit = integerPart === 1 ? 'cup' : 'cups';
        if (integerPart === 0) {
          return `${formattedTbsp} tbsp`;
        } else {
          return `${integerPart} ${cupUnit} and ${formattedTbsp} tbsp`;
        }
      }
    }

    // Tbsp to Tsp conversion for small fractions (< 1/4)
    if (['tbsp', 'tablespoon', 'tablespoons', 'tbs', 'tbs.'].includes(normalizedUnit)) {
      if (fractionalPart > tolerance && fractionalPart < 0.25 - tolerance) {
        const tspAmount = fractionalPart * 3;
        const formattedTsp = formatAmount(tspAmount);
        const tbspUnit = integerPart === 1 ? 'tbsp' : 'tbsp';
        if (integerPart === 0) {
          return `${formattedTsp} tsp`;
        } else {
          return `${integerPart} ${tbspUnit} and ${formattedTsp} tsp`;
        }
      }
    }

    return `${formatAmount(amount)} ${unit}`.trim();
  };

  const scaleIngredient = (ingredient: string | any): string => {
    if (multiplier === 1) {
      if (typeof ingredient === 'string') return ingredient;
      const displayAmount = formatAmount(ingredient.amount);
      return `${displayAmount} ${ingredient.unit || ''} ${ingredient.name}`.trim();
    }

    if (typeof ingredient === 'object') {
      const amount = evaluateFraction(ingredient.amount);
      
      if (Array.isArray(amount)) {
        const scaledStart = amount[0] * multiplier;
        const scaledEnd = amount[1] * multiplier;
        // For ranges, we'll keep it simple and just join scaled amounts
        return `${formatAmount(scaledStart)}-${formatAmount(scaledEnd)} ${ingredient.unit || ''} ${ingredient.name}`.trim();
      }

      if (isNaN(amount) || amount === 0) {
        return `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim();
      }
      const scaledAmountValue = amount * multiplier;
      const measurement = getScaledMeasurement(scaledAmountValue, ingredient.unit || '');
      return `${measurement} ${ingredient.name}`.trim();
    } else {
      // Try to match amount at the beginning of the string
      const match = ingredient.match(/^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)(.*)/);
      if (match) {
        const amountStr = match[1];
        const rest = match[2].trim();
        const amount = evaluateFraction(amountStr);
        
        if (Array.isArray(amount)) {
          const scaledStart = amount[0] * multiplier;
          const scaledEnd = amount[1] * multiplier;
          return `${formatAmount(scaledStart)}-${formatAmount(scaledEnd)} ${rest}`.trim();
        }

        if (isNaN(amount) || amount === 0) return ingredient;
        
        const scaledAmountValue = amount * multiplier;
        
        // Try to extract unit from rest to enable smart conversion
        const unitMatch = rest.match(/^([a-zA-Z\.]+)(.*)/);
        if (unitMatch) {
          const unit = unitMatch[1];
          const name = unitMatch[2].trim();
          const measurement = getScaledMeasurement(scaledAmountValue, unit);
          return `${measurement} ${name}`.trim();
        }
        
        const scaledAmount = formatAmount(scaledAmountValue);
        return `${scaledAmount} ${rest}`.trim();
      }
      return ingredient;
    }
  };

  const toggleIngredient = (index: number) => {
    const key = index.toString();
    setCheckedIngredients(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
        title="Recipe" 
        showBack 
        onBack={() => navigate('/recipes')}
        actions={
          <>
            <button 
              onClick={() => onEdit(recipe)}
              className="p-2 hover:bg-m3-surface-variant/30 text-m3-on-surface rounded-full transition-colors"
              title="Edit Recipe"
            >
              <Pencil size={20} />
            </button>
            {recipe.sourceUrl && (
              <a 
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-m3-surface-variant/30 text-m3-on-surface rounded-full transition-colors"
                title="View Original"
              >
                <ExternalLink size={20} />
              </a>
            )}
            <button 
              onClick={() => onDelete(recipe)}
              className="p-2 hover:bg-m3-surface-variant/30 text-red-600 rounded-full transition-colors"
              title="Delete Recipe"
            >
              <Trash2 size={20} />
            </button>
          </>
        }
      />
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-m3-on-surface mb-4 leading-[0.9]">
            {recipe.title}
          </h1>
          {recipe.servings && (
            <div className="flex items-center gap-6 mb-12">
              <div className="flex items-center gap-2 text-m3-on-surface-variant font-bold">
                <Users size={20} />
                <span>
                  {recipe.servings.toLowerCase().startsWith('serves') ? recipe.servings : `Serves ${recipe.servings}`}
                </span>
              </div>
              
              <div className="flex items-center bg-m3-surface-variant/20 rounded-full p-1 border border-m3-outline/10">
                <button 
                  onClick={() => setCurrentServings(prev => Math.max(1, prev - 1))}
                  className="p-1.5 hover:bg-m3-surface-variant/40 rounded-full transition-colors text-m3-primary"
                  title="Decrease servings"
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <div className="px-3 flex flex-col items-center min-w-[60px]">
                  <span className="text-xs text-m3-on-surface-variant/60 font-black uppercase tracking-tighter leading-none mb-0.5">Adjust</span>
                  <span className="text-sm font-black text-m3-on-surface leading-none">{currentServings}</span>
                </div>
                <button 
                  onClick={() => setCurrentServings(prev => prev + 1)}
                  className="p-1.5 hover:bg-m3-surface-variant/40 rounded-full transition-colors text-m3-primary"
                  title="Increase servings"
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
          <div className="space-y-12">
            {recipe.ingredientSections && recipe.ingredientSections.length > 0 ? (
              recipe.ingredientSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-4">
                  {section.title && (
                    <h2 className="text-xl font-black text-m3-primary uppercase tracking-widest border-b border-m3-outline/10 pb-2">
                      {section.title}
                    </h2>
                  )}
                  <div className="space-y-1">
                    {section.items.map((ingredient, iIdx) => {
                      const globalIdx = `s${sIdx}-i${iIdx}`;
                      const isChecked = checkedIngredients[globalIdx as any];
                      return (
                        <button 
                          key={iIdx} 
                          onClick={() => setCheckedIngredients(prev => ({ ...prev, [globalIdx]: !prev[globalIdx as any] }))}
                          className="w-full flex items-center gap-3 py-2 px-3 hover:bg-m3-surface-variant/10 transition-colors rounded-xl group text-left"
                        >
                          <div className={`w-5 h-5 border-2 rounded-md flex-shrink-0 flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-m3-primary border-m3-primary' 
                              : 'border-m3-outline/30 group-hover:border-m3-primary/50'
                          }`}>
                            {isChecked && <Check size={14} className="text-m3-on-primary" strokeWidth={4} />}
                          </div>
                          <div className="flex-1 flex flex-col">
                            <span className={`text-m3-on-surface font-bold text-lg leading-tight transition-all ${
                              isChecked ? 'opacity-50 line-through' : ''
                            }`}>
                              {scaleIngredient(ingredient)}
                              {typeof ingredient === 'object' && ingredient.isOptional && (
                                <span className="ml-2 text-[10px] bg-m3-outline-variant/20 text-m3-on-surface-variant px-1.5 py-0.5 rounded uppercase font-black vertical-middle">
                                  Optional
                                </span>
                              )}
                            </span>
                            {typeof ingredient === 'object' && ingredient.note && (
                              <span className={`text-sm italic text-m3-on-surface-variant transition-all ${
                                isChecked ? 'opacity-30' : ''
                              }`}>
                                {ingredient.note}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : recipe.ingredients && recipe.ingredients.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-m3-on-surface mb-4">Ingredients</h2>
                <div className="space-y-1">
                  {recipe.ingredients.map((ingredient, index) => {
                    const isChecked = checkedIngredients[index.toString()];
                    return (
                      <button 
                        key={index} 
                        onClick={() => toggleIngredient(index)}
                        className="w-full flex items-center gap-3 py-2 px-3 hover:bg-m3-surface-variant/10 transition-colors rounded-xl group text-left"
                      >
                        <div className={`w-5 h-5 border-2 rounded-md flex-shrink-0 flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-m3-primary border-m3-primary' 
                            : 'border-m3-outline/30 group-hover:border-m3-primary/50'
                        }`}>
                          {isChecked && <Check size={14} className="text-m3-on-primary" strokeWidth={4} />}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className={`text-m3-on-surface font-bold text-lg leading-tight transition-all ${
                            isChecked ? 'opacity-50 line-through' : ''
                          }`}>
                            {scaleIngredient(ingredient)}
                            {typeof ingredient === 'object' && ingredient.isOptional && (
                              <span className="ml-2 text-[10px] bg-m3-outline-variant/20 text-m3-on-surface-variant px-1.5 py-0.5 rounded uppercase font-black vertical-middle">
                                Optional
                              </span>
                            )}
                          </span>
                          {typeof ingredient === 'object' && ingredient.note && (
                            <span className={`text-sm italic text-m3-on-surface-variant transition-all ${
                              isChecked ? 'opacity-30' : ''
                            }`}>
                              {ingredient.note}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recipe.instructions && (
              <div>
                <h2 className="text-2xl font-bold text-m3-on-surface mb-6">Instructions</h2>
                <div className="prose prose-m3 max-w-none">
                  <Markdown>{recipe.instructions}</Markdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </motion.div>
  );
};