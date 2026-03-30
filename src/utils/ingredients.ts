import { Ingredient } from '../types';

// Format ingredient object or string for display
export const formatIngredient = (ing: Ingredient | string) => {
  if (typeof ing === 'string') return ing;
  return `${ing.amount} ${ing.unit} ${ing.name}`.trim().replace(/\s+/g, ' ');
};