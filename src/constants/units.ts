// Common cooking units for ingredient measurements
export const COMMON_UNITS = [
  "", "cup", "tbsp", "tsp", "oz", "lb", "g", "kg", "ml", "l", "pinch", "dash", "clove", "whole", "slice", "bottles", "bags"
];

// Unit conversion ratios for automatic unit conversion
export const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Volume conversions
  "cup": { "tbsp": 16, "tsp": 48, "ml": 236.588 },
  "tbsp": { "cup": 1/16, "tsp": 3, "ml": 14.7868 },
  "tsp": { "cup": 1/48, "tbsp": 1/3, "ml": 4.92892 },
  "ml": { "cup": 1/236.588, "tbsp": 1/14.7868, "tsp": 1/4.92892, "l": 0.001 },
  "l": { "ml": 1000, "cup": 4.22675 },
  
  // Weight conversions
  "oz": { "g": 28.3495, "lb": 1/16 },
  "lb": { "oz": 16, "g": 453.592, "kg": 0.453592 },
  "g": { "oz": 1/28.3495, "lb": 1/453.592, "kg": 0.001 },
  "kg": { "g": 1000, "lb": 2.20462 },
};