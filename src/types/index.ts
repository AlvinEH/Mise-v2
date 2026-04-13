import { Timestamp } from 'firebase/firestore';
import { ExtractedRecipe, Ingredient } from '../services/geminiService';

// Core Recipe Types
export interface Recipe extends ExtractedRecipe {
  id: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sourceUrl?: string;
  tags?: string[];
}

// Shopping List Types
export interface StoreList {
  id: string;
  name: string;
  userId: string;
  order: number;
  createdAt: Timestamp;
}

export interface ShoppingItem {
  id: string;
  storeListId: string;
  name: string;
  amount?: string;
  unit?: string;
  category?: string;
  completed: boolean;
  order: number;
  userId: string;
  createdAt: Timestamp;
  movedAt?: Timestamp;
}

// Theme Types
export type Theme = 'm3' | 'catppuccin' | 'rose-pine' | 'gruvbox' | 'everforest';
export type Mode = 'light' | 'dark';
export type CheckboxStyle = 'square' | 'circle';

// Error Handling Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// Component Props Types
export interface IngredientItemProps {
  ing: { id: string; amount: string; unit: string; name: string };
  index: number;
  onUpdate: (index: number, fieldOrObject: keyof Ingredient | Partial<Ingredient>, value?: string) => void;
  onRemove: (id: string) => void;
  onConvert: (index: number, targetUnit: string) => void;
}

// Meal Planning Types
export interface MealEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  type: 'lunch' | 'dinner';
  recipeId?: string; // Optional reference to a recipe
  recipeName?: string; // For quick entries without full recipes
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Export from services for convenience
export type { ExtractedRecipe, Ingredient } from '../services/geminiService';