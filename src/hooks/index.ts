import { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Theme, Mode } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  return useMemo(() => ({ user, isAuthReady }), [user, isAuthReady]);
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => 
    (localStorage.getItem('Mise-theme') as Theme) || 'm3'
  );
  const [mode, setMode] = useState<Mode>(() => 
    (localStorage.getItem('Mise-mode') as Mode) || 'light'
  );

  useEffect(() => {
    const themeValue = theme === 'm3' ? (mode === 'light' ? '' : 'm3-dark') : `${theme}-${mode}`;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    // Only update DOM if theme actually changed
    if (currentTheme !== themeValue) {
      document.documentElement.setAttribute('data-theme', themeValue);
    }
    
    localStorage.setItem('Mise-theme', theme);
    localStorage.setItem('Mise-mode', mode);
  }, [theme, mode]);

  return useMemo(() => ({ theme, setTheme, mode, setMode }), [theme, mode]);
};

// Re-export useRecipes for convenience
export { useRecipes } from './useRecipes';