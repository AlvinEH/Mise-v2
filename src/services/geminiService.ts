import { GoogleGenAI, Type } from "@google/genai";

export type Ingredient = {
  name: string;
  amount: string;
  unit: string;
} | string;

export interface ExtractedRecipe {
  title: string;
  ingredients: Ingredient[];
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
    contents: `Extract the recipe details from this URL: ${url}. Provide the title, ingredients (as objects with name, amount, and unit), instructions, and servings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.STRING },
                unit: { type: Type.STRING }
              },
              required: ['name']
            }
          },
          instructions: { type: Type.STRING },
          servings: { type: Type.STRING }
        },
        required: ['title', 'ingredients', 'instructions']
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
      { text: "Extract the recipe details from this image. Provide the title, ingredients (as objects with name, amount, and unit), instructions, and servings." },
      { inlineData: { data: base64Data, mimeType } }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.STRING },
                unit: { type: Type.STRING }
              },
              required: ['name']
            }
          },
          instructions: { type: Type.STRING },
          servings: { type: Type.STRING }
        },
        required: ['title', 'ingredients', 'instructions']
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
