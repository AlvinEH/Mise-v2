import { useState, useEffect, useMemo, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
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

export const useTheme = (user?: User | null) => {
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

  const isInitialLoad = useRef(true);
  const lastSyncedData = useRef<any>(null);

  // Sync from Firestore on mount/login
  useEffect(() => {
    if (!user) {
      isInitialLoad.current = false;
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    
    // Use onSnapshot for real-time sync across devices
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        lastSyncedData.current = data;
        
        if (data.theme) setTheme(data.theme);
        if (data.mode) setMode(data.mode);
        if (data.checkboxStyle) setCheckboxStyle(data.checkboxStyle);
        if (data.aiAutoSort !== undefined) setAiAutoSort(data.aiAutoSort);
      }
      isInitialLoad.current = false;
    }, (error) => {
      console.error("Error syncing preferences:", error);
      isInitialLoad.current = false;
    });

    return () => unsubscribe();
  }, [user]);

  // Sync to Firestore on local change
  useEffect(() => {
    // Determine if we should save to Firestore
    const isDifferentFromServer = !lastSyncedData.current || 
      theme !== lastSyncedData.current.theme ||
      mode !== lastSyncedData.current.mode ||
      checkboxStyle !== lastSyncedData.current.checkboxStyle ||
      aiAutoSort !== lastSyncedData.current.aiAutoSort;

    // Update local effects regardless of sync state
    const themeValue = theme === 'm3' ? (mode === 'light' ? '' : 'm3-dark') : `${theme}-${mode}`;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme !== themeValue) {
      document.documentElement.setAttribute('data-theme', themeValue);
    }

    // Dynamic theme-color for mobile status bar
    const themeColors: Record<string, string> = {
      '': '#ebf0eb',
      'm3-dark': '#1d211d',
      'catppuccin-light': '#e6e9ef',
      'catppuccin-dark': '#232332',
      'rose-pine-light': '#f2e9e1',
      'rose-pine-dark': '#211f32',
      'gruvbox-light': '#ebdbb2',
      'gruvbox-dark': '#32302f',
      'everforest-light': '#f3ead3',
      'everforest-dark': '#343c41',
      'nord-light': '#eceff4',
      'nord-dark': '#2e3440',
      'sakura-light': '#fffafa',
      'sakura-dark': '#2d1b1b',
      'dracula-light': '#f8f8f2',
      'dracula-dark': '#282a36',
      'solarized-light': '#fdf6e3',
      'solarized-dark': '#002b36',
    };

    const color = themeColors[themeValue] || '#ebf0eb';

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);

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

    // Save to Firestore if user exists AND values have changed from what we last saw on server
    if (user && !isInitialLoad.current && isDifferentFromServer) {
      const docRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      const newData = {
        theme,
        mode,
        checkboxStyle,
        aiAutoSort,
        updatedAt: serverTimestamp()
      };
      
      // Optimistically update lastSyncedData to prevent echo
      lastSyncedData.current = { ...newData, updatedAt: new Date() };

      setDoc(docRef, newData, { merge: true }).catch(err => {
        console.error("Error saving preferences to Firestore:", err);
      });
    }
  }, [theme, mode, checkboxStyle, aiAutoSort, user]);

  return useMemo(() => ({ 
    theme, setTheme, 
    mode, setMode, 
    checkboxStyle, setCheckboxStyle,
    aiAutoSort, setAiAutoSort
  }), [theme, mode, checkboxStyle, aiAutoSort]);
};

export { useRecipes } from './useRecipes';
export { useInventory } from './useInventory';
export { useShopping } from './useShopping';
export { useDebounce } from './useDebounce';
