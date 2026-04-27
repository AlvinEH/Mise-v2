import { GoogleGenAI, Type } from "@google/genai";

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
}

export interface AISortedItem {
  name: string;
  location: string;
  category: 'ingredient' | 'supply';
}

export const getGeminiApiKey = () => localStorage.getItem('Mise-gemini-api-key') || '';

export const extractRecipeFromUrl = async (url: string): Promise<ExtractedRecipe> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the recipe details from this URL: ${url}. 
    
    CRITICAL INSTRUCTIONS:
    1. Capture ingredients and instructions EXACTLY as written. Do not summarize or omit steps.
    2. Do NOT change amounts or units unless converting simple fractions to decimals (e.g., "1/2" to "0.5"). Keep complex fractions if they don't convert neatly.
    3. Look for the main recipe content. If this is a Reddit link to a specific comment, focus on that comment's text.
    4. Distinguish between the core ingredient name and 'notes' or preparation details. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise.
    5. Identify if an ingredient is mentioned as optional.

    For instructions, treat each distinct paragraph or section of text that describes a part of the culinary process as a separate instruction step. Ensure the returned instructions string has steps separated by clear newlines.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredientSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Title of the section, e.g., 'For the cake' or leave empty if there's only one main list" },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      note: { type: Type.STRING, description: "Any extra notes like 'softened', 'diced', or preparation details" },
                      isOptional: { type: Type.BOOLEAN, description: "True if the ingredient is explicitly mentioned as optional" }
                    },
                    required: ['name']
                  }
                }
              },
              required: ['items']
            }
          },
          instructions: { type: Type.STRING },
          servings: { type: Type.STRING }
        },
        required: ['title', 'ingredientSections', 'instructions']
      }
    }
  });

  const response = await model;
  return JSON.parse(response.text);
};

export const extractRecipeFromText = async (text: string): Promise<ExtractedRecipe> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the recipe details from this text: 
    
    ---
    ${text}
    ---
    
    CRITICAL INSTRUCTIONS:
    1. Capture ingredients and instructions EXACTLY as written. Do not summarize or omit steps.
    2. Do NOT change amounts or units unless converting simple fractions to decimals (e.g., "1/2" to "0.5"). Keep complex fractions if they don't convert neatly.
    3. Distinguish between the core ingredient name and 'notes' or preparation details. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise.
    4. Identify if an ingredient is mentioned as optional.

    For instructions, treat each distinct paragraph or section of text that describes a part of the culinary process as a separate instruction step. Ensure the returned instructions string has steps separated by clear newlines.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredientSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      note: { type: Type.STRING },
                      isOptional: { type: Type.BOOLEAN }
                    },
                    required: ['name']
                  }
                }
              },
              required: ['items']
            }
          },
          instructions: { type: Type.STRING },
          servings: { type: Type.STRING }
        },
        required: ['title', 'ingredientSections', 'instructions']
      }
    }
  });

  const response = await model;
  return JSON.parse(response.text);
};

export const extractRecipeFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedRecipe> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { text: "Extract the recipe details from this image. Provide the title, ingredients organized into sections (e.g., 'Main Ingredients', 'Frosting'), instructions, and servings. Capture ingredients and instructions EXACTLY as written in the image. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise. Identify optional flags." },
      { inlineData: { data: base64Data, mimeType } }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredientSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      note: { type: Type.STRING },
                      isOptional: { type: Type.BOOLEAN }
                    },
                    required: ['name']
                  }
                }
              },
              required: ['items']
            }
          },
          instructions: { type: Type.STRING },
          servings: { type: Type.STRING }
        },
        required: ['title', 'ingredientSections', 'instructions']
      }
    }
  });

  const response = await model;
  return JSON.parse(response.text);
};

export const suggestLocationsBatched = async (
  itemNames: string[], 
  existingRules?: { keyword: string; location: string; category: string }[]
): Promise<Map<string, { location: string; category: 'ingredient' | 'supply' }>> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });
  
  const rulesContext = existingRules && existingRules.length > 0 
    ? `Follow the pattern of these existing user rules for similar items:
${existingRules.map(r => `- ${r.keyword} -> ${r.location} (${r.category})`).join('\n')}`
    : '';

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Categorize the following household/grocery items. For each item, decide if it belongs in one of these locations: 'Pantry', 'Freezer', 'Refrigerator', 'Washroom', 'Laundry Room', 'Under Sink', or 'Cat Supplies'. Also decide if it is an 'ingredient' or a 'supply'.
    
    ${rulesContext}
    
    Items: ${itemNames.join(', ')}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            location: { 
              type: Type.STRING, 
              enum: ['Pantry', 'Freezer', 'Refrigerator', 'Washroom', 'Laundry Room', 'Under Sink', 'Cat Supplies'] 
            },
            category: { 
              type: Type.STRING, 
              enum: ['ingredient', 'supply'] 
            }
          },
          required: ['name', 'location', 'category']
        }
      }
    }
  });

  try {
    const response = await model;
    const results: AISortedItem[] = JSON.parse(response.text);
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
