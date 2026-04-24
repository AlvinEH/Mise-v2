/**
 * Simple localStorage-based cache utility for instant UI loading
 */

export const STORAGE_KEYS = {
  INVENTORY_ITEMS: 'mise_cache_inventory_items',
  INVENTORY_LOCATIONS: 'mise_cache_inventory_locations',
  SHOPPING_ITEMS: 'mise_cache_shopping_items',
  SHOPPING_LISTS: 'mise_cache_shopping_lists',
};

export const SESSION_KEYS = {
  NEW_AUTO_SORT_RULES: 'mise_session_new_auto_sort_rules',
};

export const cacheData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache data to localStorage', e);
  }
};

export const getCachedData = <T>(key: string): T | null => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to retrieve cached data from localStorage', e);
    return null;
  }
};

export const setSessionData = (key: string, data: any) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to set session data', e);
  }
};

export const getSessionData = <T>(key: string): T | null => {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to get session data', e);
    return null;
  }
};
