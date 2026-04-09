// Utility functions for parsing units from shopping item names

export interface ParsedItem {
  name: string;
  amount: string;
  unit: string;
}

// Helper function to capitalize every word
const capitalizeWords = (str: string): string => {
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Common unit patterns that should be extracted
const UNIT_PATTERNS = [
  // Recipe ingredient patterns (amount unit name) - check these first
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|litres?|fl\s*oz|fluid\s+ounces?)\s+(cans?|bottles?)\s+(.+)$/i, format: (amount: string, unit: string, container: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: `${unit.toLowerCase()} ${container.toLowerCase()}` }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(cups?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'cup' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(tbsp|tablespoons?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'tbsp' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(tsp|teaspoons?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'tsp' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(lbs?|pounds?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'lb' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(oz|ounces?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'oz' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(g|grams?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'g' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(kg|kilograms?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'kg' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(ml|milliliters?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'ml' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(l|liters?|litres?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'l' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(fl\s*oz|fluid\s+ounces?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'fl oz' }) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?)\s*(racks?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'Rack' }) },
  // Supply unit patterns - matching InventoryPage supply units
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(pieces?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'pieces' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(rolls?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'rolls' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(boxes?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'boxes' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(packs?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'packs' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(sets?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'sets' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(bottles?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'bottles' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(tubes?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'tubes' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(sheets?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'sheets' }) },
  // Legacy unit patterns - kept for backward compatibility
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(bags?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'bags' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(jugs?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'jugs' }) },
  { regex: /^(\d+(?:[/\.\s]*\d+)?)\s*(cans?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => ({ name: capitalizeWords(name.trim()), amount: amount.trim(), unit: 'cans' }) },
  // Numeric patterns
  { regex: /(.+?)\s*x\s*(\d+(?:\.\d+)?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'x' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*x\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'x' }) },
  
  // Weight units (name amount unit)
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'lb' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'oz' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'g' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'kg' }) },
  
  // Volume units (name amount unit)
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:cups?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'cup' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'tbsp' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'tsp' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'ml' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:l|liters?|litres?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'l' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:fl\s*oz|fluid\s+ounces?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'fl oz' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:racks?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'Rack' }) },
  // Supply units (name amount unit) - matching InventoryPage supply units
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:pieces?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'pieces' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:rolls?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'rolls' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:boxes?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'boxes' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:packs?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'packs' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:sets?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'sets' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:bottles?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'bottles' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:tubes?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'tubes' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:sheets?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'sheets' }) },
  // Legacy unit patterns - kept for backward compatibility
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:bags?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'bags' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:jugs?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'jugs' }) },
  { regex: /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:cans?)\s*$/i, format: (name: string, amount: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'cans' }) },
  
  // Count patterns (at beginning)
  { regex: /^(\d+(?:\.\d+)?)\s*x\s*(.+)$/i, format: (amount: string, name: string) => ({ name: capitalizeWords(name.trim()), amount, unit: 'x' }) },
  { regex: /^(\d+(?:\.\d+)?)\s+(.+)$/i, format: (amount: string, name: string) => ({ name: capitalizeWords(name.trim()), amount, unit: '' }) },
];

/**
 * Parse a shopping item name to extract units and amounts
 */
export const parseShoppingItem = (itemName: string): ParsedItem => {
  const trimmedName = itemName.trim();
  console.log('parseShoppingItem called with:', trimmedName);
  
  for (let i = 0; i < UNIT_PATTERNS.length; i++) {
    const pattern = UNIT_PATTERNS[i];
    const match = trimmedName.match(pattern.regex);
    console.log(`Pattern ${i} (${pattern.regex}):`, match ? 'MATCH' : 'no match');
    if (match) {
      console.log('Match details:', match);
      // Determine how many capture groups we have
      const captureGroups = match.length - 1; // Exclude the full match
      console.log('Capture groups count:', captureGroups);
      
      let parsed;
      if (captureGroups === 4) {
        // 4 capture groups: amount unit container name
        console.log('Using 4-group format with:', match[1], match[2], match[3], match[4]);
        parsed = (pattern as any).format(match[1], match[2], match[3], match[4]);
      } else if (captureGroups === 3) {
        // 3 capture groups: amount unit name (recipe format)
        console.log('Using 3-group format with:', match[1], match[2], match[3]);
        parsed = (pattern as any).format(match[1], match[2], match[3]);
      } else if (captureGroups === 2) {
        // 2 capture groups: various formats
        console.log('Using 2-group format with:', match[1], match[2]);
        parsed = (pattern as any).format(match[1], match[2]);
      } else {
        console.log('Skipping malformed pattern with', captureGroups, 'groups');
        continue; // Skip malformed patterns
      }
      
      console.log('Pattern format result:', parsed);
      const result = {
        name: parsed.name,
        amount: parsed.amount,
        unit: parsed.unit
      };
      console.log('Final parseShoppingItem result:', result);
      return result;
    }
  }
  
  // If no pattern matches, return the original name with no units
  return {
    name: capitalizeWords(trimmedName),
    amount: '',
    unit: ''
  };
};

/**
 * Format a shopping item for display with units at the front
 */
export const formatShoppingItemDisplay = (name: string, amount?: string, unit?: string): string => {
  if (amount && unit) {
    if (unit === 'x') {
      return `${amount}x ${name}`;
    }
    return `${amount}${unit} ${name}`;
  } else if (amount) {
    return `${amount} ${name}`;
  }
  return name;
};

/**
 * Get the display text for a shopping item, parsing units if needed
 */
export const getShoppingItemDisplayText = (item: { name: string; amount?: string; unit?: string }): string => {
  // If item already has parsed amount/unit, use those
  if (item.amount || item.unit) {
    return formatShoppingItemDisplay(item.name, item.amount, item.unit);
  }
  
  // Otherwise, try to parse the name for embedded units
  const parsed = parseShoppingItem(item.name);
  if (parsed.amount) {
    return formatShoppingItemDisplay(parsed.name, parsed.amount, parsed.unit);
  }
  
  return item.name;
};