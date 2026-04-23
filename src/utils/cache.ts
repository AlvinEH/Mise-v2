/**
 * Simple localStorage-based cache utility for instant UI loading
 */

export const STORAGE_KEYS = {
  INVENTORY_ITEMS: 'mise_cache_inventory_items',
  INVENTORY_LOCATIONS: 'mise_cache_inventory_locations',
  SHOPPING_ITEMS: 'mise_cache_shopping_items',
  SHOPPING_LISTS: 'mise_cache_shopping_lists',
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
