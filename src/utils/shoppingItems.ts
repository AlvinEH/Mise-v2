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

// Helper function to evaluate fractions and mixed numbers (e.g., "1 1/2" -> "1.5")
export const evaluateFraction = (str: string): number | [number, number] => {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  
  // Handle ranges like "0.75-1", "0.75 to 1", "1-2"
  const rangeDelimiters = [/ to /i, /\s*-\s*/];
  for (const delim of rangeDelimiters) {
    const parts = trimmed.split(delim);
    if (parts.length === 2) {
      const start = evaluateFraction(parts[0]);
      const end = evaluateFraction(parts[1]);
      if (typeof start === 'number' && typeof end === 'number' && !isNaN(start) && !isNaN(end)) {
        return [start, end];
      }
    }
  }
  
  if (trimmed.includes('/')) {
    const parts = trimmed.split(/\s+/);
    let total = 0;
    for (const part of parts) {
      if (part.includes('/')) {
        const [num, den] = part.split('/').map(Number);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          total += num / den;
        }
      } else {
        const val = parseFloat(part);
        if (!isNaN(val)) total += val;
      }
    }
    return total;
  }
  
  const val = parseFloat(trimmed);
  return isNaN(val) ? 0 : val;
};

/**
 * Format a numeric string or number as a fraction or mixed number
 * e.g., "1.5" -> "1 1/2", "0.25" -> "1/4"
 */
export const formatAmount = (num: number | string | [number, number]): string => {
  if (Array.isArray(num)) {
    return `${formatAmount(num[0])}-${formatAmount(num[1])}`;
  }
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return typeof num === 'string' ? num : '';
  
  // Check if it's a numeric range string like "0.75-1"
  if (typeof num === 'string' && (num.includes('-') || num.includes(' to '))) {
    const rangeDelimiters = [/ to /i, /\s*-\s*/];
    for (const delim of rangeDelimiters) {
      const parts = num.split(delim);
      if (parts.length === 2) {
        return `${formatAmount(parts[0])}-${formatAmount(parts[1])}`;
      }
    }
  }

  // Round to 3 decimal places for better matching
  const rounded = Math.round(value * 1000) / 1000;
  const integerPart = Math.floor(rounded + 0.0001);
  const fractionalPart = rounded - integerPart;
  
  if (fractionalPart < 0.01) return integerPart.toString();
  if (fractionalPart > 0.99) return (integerPart + 1).toString();

  // Find best fraction with common cooking denominators
  let bestNum = 0;
  let bestDen = 1;
  let minDiff = fractionalPart;
  
  const dens = [2, 3, 4, 8];
  
  for (const d of dens) {
    const n = Math.round(fractionalPart * d);
    if (n === 0 || n === d) continue;
    const diff = Math.abs(fractionalPart - n / d);
    if (diff < minDiff) {
      minDiff = diff;
      bestNum = n;
      bestDen = d;
    }
  }
  
  // If we found a good fraction (within reasonable error for cooking)
  if (minDiff < 0.01) {
    // Simplify
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const common = gcd(bestNum, bestDen);
    const finalNum = bestNum / common;
    const finalDen = bestDen / common;
    
    const fractionStr = `${finalNum}/${finalDen}`;
    return integerPart > 0 ? `${integerPart} ${fractionStr}` : fractionStr;
  }

  // Fallback to decimal if no good fraction found
  return (Math.round(value * 100) / 100).toString();
};

// Help helper function to parse results and normalize amount
const finalizeResult = (name: string, amount: string, unit: string) => {
  const numericAmount = evaluateFraction(amount);
  let finalAmount = amount;
  let finalUnit = unit.trim();
  
  const isGreaterThanOne = (val: number | [number, number]): boolean => {
    if (Array.isArray(val)) return val[1] > 1;
    return val > 1;
  };

  if (Array.isArray(numericAmount)) {
    finalAmount = `${Math.round(numericAmount[0] * 100) / 100}-${Math.round(numericAmount[1] * 100) / 100}`;
  } else if (numericAmount > 0) {
    finalAmount = (Math.round(numericAmount * 100) / 100).toString();
  }

  // Handle cup/cups pluralization
  if (finalUnit.toLowerCase() === 'cup' || finalUnit.toLowerCase() === 'cups') {
    if (isGreaterThanOne(numericAmount)) {
      finalUnit = 'cups';
    } else if (numericAmount === 1) {
      finalUnit = 'cup';
    }
  }

  return {
    name: capitalizeWords(name.trim()),
    amount: finalAmount,
    unit: finalUnit
  };
};

// Common unit patterns that should be extracted
const UNIT_PATTERNS = [
  // Recipe ingredient patterns (amount unit name) - check these first
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|litres?|fl\s*oz|fluid\s+ounces?)\s+(cans?|bottles?|bags?|boxes?|packs?|jars?|cartons?|pouches?|tubes?|tubs?|sachets?)\s+(.+)$/i, format: (amount: string, unit: string, container: string, name: string) => finalizeResult(name, amount, `${unit.toLowerCase()} ${container.toLowerCase()}`) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(cups?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, unit) },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(tbsp|tablespoons?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'tbsp') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(tsp|teaspoons?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'tsp') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(lbs?|pounds?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'lb') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(oz|ounces?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'oz') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(g|grams?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'g') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(kg|kilograms?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'kg') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(ml|milliliters?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'ml') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(l|liters?|litres?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'l') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(fl\s*oz|fluid\s+ounces?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'fl oz') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(racks?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'Rack') },
  // Supply unit patterns - matching InventoryPage supply units
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(pieces?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'pieces') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(rolls?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'rolls') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(boxes?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'boxes') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(packs?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'packs') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(sets?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'sets') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(bottles?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'bottles') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(tubes?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'tubes') },
  { regex: /^(\d+(?:[/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[/\.\s]*\d+)?)?)\s*(sheets?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'sheets') },
  // Legacy unit patterns - kept for backward compatibility
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(bags?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'bags') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(jugs?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'jugs') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(cans?)\s+(.+)$/i, format: (amount: string, unit: string, name: string) => finalizeResult(name, amount, 'cans') },
  // Numeric patterns
  { regex: /(.+?)\s*x\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'x') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*x\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'x') },
  
  // Weight units (name amount unit)
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:lbs?|pounds?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'lb') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:oz|ounces?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'oz') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:g|grams?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'g') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:kg|kilograms?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'kg') },
  
  // Volume units (name amount unit)
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:cups?)\s*$/i, format: (name: string, amount: string, unit: string) => finalizeResult(name, amount, unit) },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:tbsp|tablespoons?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'tbsp') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:tsp|teaspoons?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'tsp') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:ml|milliliters?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'ml') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:l|liters?|litres?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'l') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:fl\s*oz|fluid\s+ounces?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'fl oz') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:racks?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'Rack') },
  // Supply units (name amount unit) - matching InventoryPage supply units
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:pieces?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'pieces') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:rolls?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'rolls') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:boxes?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'boxes') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:packs?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'packs') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:sets?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'sets') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:bottles?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'bottles') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:tubes?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'tubes') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:sheets?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'sheets') },
  // Legacy unit patterns - kept for backward compatibility
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:bags?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'bags') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:jugs?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'jugs') },
  { regex: /(.+?)\s*(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*(?:cans?)\s*$/i, format: (name: string, amount: string) => finalizeResult(name, amount, 'cans') },
  
  // Count patterns (at beginning)
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s*x\s*(.+)$/i, format: (amount: string, name: string) => finalizeResult(name, amount, 'x') },
  { regex: /^(\d+(?:[\/\.\s]*\d+)?(?:\s*(?:to|-|—)\s*\d+(?:[\/\.\s]*\d+)?)?)\s+(.+)$/i, format: (amount: string, name: string) => finalizeResult(name, amount, '') },
];

/**
 * Parse a shopping item name to extract units and amounts
 */
export const parseShoppingItem = (itemName: string): ParsedItem => {
  const trimmedName = itemName.trim();
  
  // 1. Check for multiplier at start (e.g., "2x 6lb bag potatoes", "2x apples")
  const startMultiplierMatch = trimmedName.match(/^(\d+(?:\.\d+)?)\s*[xX]\s*(.+)$/i);
  if (startMultiplierMatch) {
    const amount = startMultiplierMatch[1];
    const remainder = startMultiplierMatch[2].trim();
    if (remainder) {
      const inner = parseShoppingItem(remainder);
      return {
        name: inner.name,
        amount: amount,
        unit: inner.amount ? `${inner.amount}${inner.unit ? ' ' + inner.unit : ''}` : inner.unit
      };
    }
  }

  // 2. Check for multiplier at end (e.g., "6lb bag potatoes x2", "6lb bag potatoes 2x")
  const endMultiplierMatch = trimmedName.match(/^(.+?)\s*[xX](\d+(?:\.\d+)?)\s*$|^(.+?)\s+(\d+(?:\.\d+)?)\s*[xX]\s*$/i);
  if (endMultiplierMatch) {
    const remainder = (endMultiplierMatch[1] || endMultiplierMatch[3]).trim();
    const amount = endMultiplierMatch[2] || endMultiplierMatch[4];
    if (remainder) {
      const inner = parseShoppingItem(remainder);
      return {
        name: inner.name,
        amount: amount,
        unit: inner.amount ? `${inner.amount}${inner.unit ? ' ' + inner.unit : ''}` : inner.unit
      };
    }
  }

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