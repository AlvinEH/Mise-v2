export interface SystemSortRule {
  keyword: string;
  location: string;
  category: 'ingredient' | 'supply';
}

export const AUTO_SORT_DEFAULTS: SystemSortRule[] = [
  // Ambiguous items that might need hardcoded defaults
  { keyword: 'snack', location: 'Pantry', category: 'ingredient' },
  { keyword: 'detergent', location: 'Laundry Room', category: 'supply' },
  { keyword: 'laundry', location: 'Laundry Room', category: 'supply' },
  { keyword: 'bags', location: 'Pantry', category: 'supply' }
];
