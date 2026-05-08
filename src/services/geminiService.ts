import { auth } from "../firebase";

export type Ingredient = {
  name: string;
  amount: string;
  unit: string;
  note?: string;
  isOptional?: boolean;
} | string;

export type IngredientSection = {
  title?: string;
  items: Ingredient[];
};

export interface ExtractedRecipe {
  title: string;
  ingredientSections: IngredientSection[];
  instructions: string;
  servings: string;
  notes?: string;
}

export interface AISortedItem {
  name: string;
  location: string;
  category: 'ingredient' | 'supply';
}

const executeGemini = async (operation: string, params: any): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  const response = await fetch('/api/gemini/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ operation, params })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to execute Gemini operation');
  }

  const data = await response.json();
  return data.result;
};

export const extractRecipeFromUrl = async (url: string): Promise<ExtractedRecipe> => {
  const prompt = `Extract the recipe details from this URL: ${url}. 
    
    CRITICAL INSTRUCTIONS:
    1. Capture ingredients and instructions EXACTLY as written. Do not summarize or omit steps.
    2. Do NOT change amounts or units unless converting simple fractions to decimals (e.g., "1/2" to "0.5"). Keep complex fractions if they don't convert neatly.
    3. Look for the main recipe content. If this is a Reddit link to a specific comment, focus on that comment's text.
    4. Distinguish between the core ingredient name and 'notes' or preparation details. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise.
    5. Identify if an ingredient is mentioned as optional.
    6. Extract any extra tips, notes, or variations provided in the recipe and put them in the 'notes' field.

    For instructions, treat each distinct paragraph or section of text that describes a part of the culinary process as a separate instruction step. Ensure the returned instructions string has steps separated by clear newlines.`;

  const config = {
    responseMimeType: "application/json",
    // We omit the complex responseSchema here and let the server-side model handle it 
    // or we can pass it if we want to be strict. For simplicity in the proxy, 
    // we'll use consistent prompts and expect the same results.
  };

  const result = await executeGemini('generateContent', { prompt, config });
  return JSON.parse(result);
};

export const extractRecipeFromText = async (text: string): Promise<ExtractedRecipe> => {
  const prompt = `Extract the recipe details from this text: 
    
    ---
    ${text}
    ---
    
    CRITICAL INSTRUCTIONS:
    1. Capture ingredients and instructions EXACTLY as written. Do not summarize or omit steps.
    2. Do NOT change amounts or units unless converting simple fractions to decimals (e.g., "1/2" to "0.5"). Keep complex fractions if they don't convert neatly.
    3. Distinguish between the core ingredient name and 'notes' or preparation details. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise.
    5. Identify if an ingredient is mentioned as optional.
    6. Extract any extra tips, notes, or variations provided in the recipe and put them in the 'notes' field.

    For instructions, treat each distinct paragraph or section of text that describes a part of the culinary process as a separate instruction step. Ensure the returned instructions string has steps separated by clear newlines.`;

  const config = {
    responseMimeType: "application/json",
  };

  const result = await executeGemini('generateContent', { prompt, config });
  return JSON.parse(result);
};

export const extractRecipeFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedRecipe> => {
  const prompt = "Extract the recipe details from this image. Provide the title, ingredients organized into sections (e.g., 'Main Ingredients', 'Frosting'), instructions, servings, and any extra tips or notes. Capture ingredients and instructions EXACTLY as written in the image. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise. Identify optional flags. Extract any extra tips, notes, or variations provided in the recipe into the 'notes' field.";
  
  const config = {
    responseMimeType: "application/json",
  };

  const result = await executeGemini('generateContentWithImage', { 
    prompt, 
    imageData: base64Data, 
    mimeType,
    config 
  });
  return JSON.parse(result);
};

export const suggestLocationsBatched = async (
  itemNames: string[], 
  existingRules?: { keyword: string; location: string; category: string }[]
): Promise<Map<string, { location: string; category: 'ingredient' | 'supply' }>> => {
  const rulesContext = existingRules && existingRules.length > 0 
    ? `Follow the pattern of these existing user rules for similar items:
${existingRules.map(r => `- ${r.keyword} -> ${r.location} (${r.category})`).join('\n')}`
    : '';

  const prompt = `Categorize the following household/grocery items. For each item, decide if it belongs in one of these locations: 'Pantry', 'Freezer', 'Refrigerator', 'Washroom', 'Laundry Room', 'Under Sink', or 'Cat Supplies'. Also decide if it is an 'ingredient' or a 'supply'.
    
    ${rulesContext}
    
    Items: ${itemNames.join(', ')}`;

  const config = {
    responseMimeType: "application/json",
  };

  try {
    const result = await executeGemini('generateContent', { prompt, config });
    const results: AISortedItem[] = JSON.parse(result);
    const resultMap = new Map<string, { location: string; category: 'ingredient' | 'supply' }>();
    
    results.forEach(res => {
      resultMap.set(res.name.toLowerCase(), {
        location: res.location,
        category: res.category
      });
    });

    return resultMap;
  } catch (error) {
    console.error('Gemini AI Sorting Error:', error);
    throw error;
  }
};
