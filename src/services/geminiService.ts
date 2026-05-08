import { GoogleGenAI, Type } from "@google/genai";
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
  // 1. Try proxy first (standard AI Studio environment)
  const user = auth.currentUser;
  
  // Note: We try the proxy if there's a user, but we don't throw yet if it fails, 
  // as we might be in a static hosting environment where the user should provide their own key.
  if (user) {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/gemini/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ operation, params })
      });

      if (response.ok) {
        const data = await response.json();
        return data.result;
      }
      
      // If we got an error from the server (like 400 or 500), we log it but might still try local fallback
      const errorData = await response.json().catch(() => ({}));
      console.warn('Gemini proxy returned an error:', response.status, errorData);
    } catch (proxyError) {
      console.warn('Proxy execution failed or unavailable, checking for local key fallback.', proxyError);
    }
  }

  // 2. Fallback to direct client-side call if a key is provided (for static hosting like GitHub Pages)
  const savedKey = localStorage.getItem('Mise-gemini-api-key');
  const localKey = (savedKey && typeof savedKey === 'string' && savedKey.trim() !== '' && savedKey !== 'undefined' && savedKey !== 'null') ? savedKey.trim() : null;

  if (localKey && localKey.length > 5) {
    try {
      console.log('[Gemini Service] Attempting direct client execution with local key...');
      const ai = new GoogleGenAI({ apiKey: localKey });
      if (operation === 'generateContent') {
        const { prompt, config } = params;
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: config
        });
        return response.text || '';
      }
    } catch (clientError) {
      console.error('Direct Gemini execution failed:', clientError);
      throw clientError;
    }
  }

  const errorMessage = user 
    ? 'Gemini API execution failed. The server key is missing or invalid, and no local key is configured in Settings.'
    : 'Gemini API execution failed. You are not signed in or no local API key is configured in Settings for static hosting.';
    
  throw new Error(errorMessage);
};

const getRecipeSchema = () => ({
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
              required: ["name"]
            }
          }
        },
        required: ["items"]
      }
    },
    instructions: { type: Type.STRING },
    servings: { type: Type.STRING },
    notes: { type: Type.STRING }
  },
  required: ["title", "ingredientSections", "instructions"]
});

const getCategorizationSchema = () => ({
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
    required: ["name", "location", "category"]
  }
});

const cleanJsonResponse = (text: string): string => {
  if (!text) return text;
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith('```')) {
      lines.pop();
    }
    cleaned = lines.join('\n').trim();
  }
  return cleaned;
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

  try {
    const result = await executeGemini('generateContent', {
      prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getRecipeSchema()
      }
    });

    const cleaned = cleanJsonResponse(result || '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini Recipe Extraction Error (URL):', error);
    throw new Error('Failed to extract recipe from URL.');
  }
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

  try {
    const result = await executeGemini('generateContent', {
      prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getRecipeSchema()
      }
    });

    const cleaned = cleanJsonResponse(result || '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini Recipe Extraction Error (Text):', error);
    throw new Error('Failed to extract recipe from text.');
  }
};

export const extractRecipeFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedRecipe> => {
  // Keeping this simple for now, using generateContent logic.
  // Full image support in executeGemini would require more complex proxy params.
  throw new Error("Image extraction not currently supported via secure proxy.");
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

  try {
    const result = await executeGemini('generateContent', {
      prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getCategorizationSchema()
      }
    });

    const cleaned = cleanJsonResponse(result || '');
    try {
      const results: AISortedItem[] = JSON.parse(cleaned);
      const resultMap = new Map<string, { location: string; category: 'ingredient' | 'supply' }>();
      
      results.forEach(res => {
        resultMap.set(res.name.toLowerCase(), {
          location: res.location,
          category: res.category
        });
      });

      return resultMap;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', cleaned);
      throw new Error(`AI returned invalid JSON: ${cleaned.substring(0, 50)}...`);
    }
  } catch (error) {
    console.error('Gemini AI Sorting Error:', error);
    throw error;
  }
};
