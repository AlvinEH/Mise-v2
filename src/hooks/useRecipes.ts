import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { Recipe, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestore';

export const useRecipes = (user: User | null) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('alpha');

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      return;
    }

    const q = query(collection(db, 'recipes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(recipesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'recipes'));

    return unsubscribe;
  }, [user?.uid]);

  const handleDelete = useCallback(async (recipeId: string) => {
    try {
      await deleteDoc(doc(db, 'recipes', recipeId));
      setRecipeToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipes/${recipeId}`);
    }
  }, []);

  return useMemo(() => ({
    recipes,
    recipeToDelete,
    setRecipeToDelete,
    sortBy,
    setSortBy,
    handleDelete
  }), [recipes, recipeToDelete, sortBy, handleDelete]);
};