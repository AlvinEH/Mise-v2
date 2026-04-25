import { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { auth } from '../firebase';
import { Theme, Mode, CheckboxStyle } from '../types';

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
  const [checkboxStyle, setCheckboxStyle] = useState<CheckboxStyle>(() => 
    (localStorage.getItem('Mise-checkbox-style') as CheckboxStyle) || 'square'
  );
  const [aiAutoSort, setAiAutoSort] = useState<boolean>(() => 
    localStorage.getItem('Mise-ai-auto-sort') === 'true'
  );

  useEffect(() => {
    const themeValue = theme === 'm3' ? (mode === 'light' ? '' : 'm3-dark') : `${theme}-${mode}`;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    // Only update DOM if theme actually changed
    if (currentTheme !== themeValue) {
      document.documentElement.setAttribute('data-theme', themeValue);
    }

    // Dynamic theme-color for mobile status bar (matches PageHeader background)
    const themeColors: Record<string, string> = {
      '': '#ebf0eb',              // m3 light (default)
      'm3-dark': '#1d211d',
      'catppuccin-light': '#e6e9ef',
      'catppuccin-dark': '#232332',
      'rose-pine-light': '#f2e9e1',
      'rose-pine-dark': '#211f32',
      'gruvbox-light': '#ebdbb2',
      'gruvbox-dark': '#32302f',
      'everforest-light': '#f3ead3',
      'everforest-dark': '#343c41',
    };

    const color = themeColors[themeValue] || '#ebf0eb';

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);

    // native Capacitor status bar handling
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setBackgroundColor({ color });
        StatusBar.setStyle({ 
          style: mode === 'dark' ? Style.Dark : Style.Light 
        });
      } catch (error) {
        console.warn('StatusBar not available', error);
      }
    }
    
    localStorage.setItem('Mise-theme', theme);
    localStorage.setItem('Mise-mode', mode);
    localStorage.setItem('Mise-checkbox-style', checkboxStyle);
    localStorage.setItem('Mise-ai-auto-sort', String(aiAutoSort));
  }, [theme, mode, checkboxStyle, aiAutoSort]);

  return useMemo(() => ({ 
    theme, setTheme, 
    mode, setMode, 
    checkboxStyle, setCheckboxStyle,
    aiAutoSort, setAiAutoSort
  }), [theme, mode, checkboxStyle, aiAutoSort]);
};

// Re-export useRecipes for convenience
export { useRecipes } from './useRecipes';
export { useInventory } from './useInventory';
export { useShopping } from './useShopping';
