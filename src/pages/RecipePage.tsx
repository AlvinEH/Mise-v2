import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, ExternalLink, Pencil, Check, Users, Plus, Minus } from 'lucide-react';
import Markdown from 'react-markdown';
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
  
  const extractServings = (servingsStr: string | undefined): number => {
    if (!servingsStr) return 1;
    const match = servingsStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const originalServings = extractServings(recipe?.servings);
  const [currentServings, setCurrentServings] = useState(originalServings);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (recipe) {
      setCurrentServings(extractServings(recipe.servings));
      setCheckedIngredients({});
    }
  }, [id, recipe?.servings]);

  const fractionToDecimal = (str: string): number => {
    if (!str) return 0;
    if (str.includes('/')) {
      const parts = str.trim().split(/\s+/);
      let total = 0;
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/').map(Number);
          if (!isNaN(num) && !isNaN(den) && den !== 0) {
            total += num / den;
          }
        } else {
          const val = Number(part);
          if (!isNaN(val)) total += val;
        }
      }
      return total;
    }
    return Number(str);
  };

  const formatAmount = (num: number): string => {
    if (num === 0) return '';
    
    // Round to 3 decimal places for better matching
    const rounded = Math.round(num * 1000) / 1000;
    const integerPart = Math.floor(rounded + 0.0001);
    const fractionalPart = rounded - integerPart;
    
    if (fractionalPart < 0.01) return integerPart.toString();
    if (fractionalPart > 0.99) return (integerPart + 1).toString();

    // Find best fraction with common cooking denominators
    let bestNum = 0;
    let bestDen = 1;
    let minDiff = fractionalPart;
    
    const dens = [2, 3, 4, 8, 16];
    
    for (const d of dens) {
      const n = Math.round(fractionalPart * d);
      if (n === 0 || n === d) continue;
      const diff = Math.abs(fractionalPart - n / d);
      if (diff < minDiff) {
        minDiff = diff;
        bestNum = n;
        bestDen = d;
      }
    }
    
    // If we found a good fraction (within reasonable error for cooking)
    if (minDiff < 0.03) {
      // Simplify
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const common = gcd(bestNum, bestDen);
      const finalNum = bestNum / common;
      const finalDen = bestDen / common;
      
      const fractionStr = `${finalNum}/${finalDen}`;
      return integerPart > 0 ? `${integerPart} ${fractionStr}` : fractionStr;
    }

    // Fallback to decimal if no good fraction found
    return (Math.round(num * 100) / 100).toString();
  };

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
      return typeof ingredient === 'string' 
        ? ingredient 
        : `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim();
    }

    if (typeof ingredient === 'object') {
      const amount = fractionToDecimal(ingredient.amount);
      if (isNaN(amount) || amount === 0) {
        return `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim();
      }
      const scaledAmountValue = amount * multiplier;
      const measurement = getScaledMeasurement(scaledAmountValue, ingredient.unit || '');
      return `${measurement} ${ingredient.name}`.trim();
    } else {
      // Try to match amount at the beginning of the string
      const match = ingredient.match(/^(\d+(?:[\/\.\s]*\d+)?)(.*)/);
      if (match) {
        const amountStr = match[1];
        const rest = match[2].trim();
        const amount = fractionToDecimal(amountStr);
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
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
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
          <div className="space-y-8">
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-m3-on-surface mb-4">Ingredients</h2>
            <div className="space-y-1">
              {recipe.ingredients.map((ingredient, index) => {
                const isChecked = checkedIngredients[index];
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
                    <span className={`text-m3-on-surface font-bold text-base leading-tight transition-all ${
                      isChecked ? 'opacity-50 line-through' : ''
                    }`}>
                      {scaleIngredient(ingredient)}
                    </span>
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