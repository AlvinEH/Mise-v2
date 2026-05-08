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
  notes?: string;
}

export interface AISortedItem {
  name: string;
  location: string;
  category: 'ingredient' | 'supply';
}

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: getRecipeSchema()
      }
    });

    const cleaned = cleanJsonResponse(response.text || '');
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: getRecipeSchema()
      }
    });

    const cleaned = cleanJsonResponse(response.text || '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini Recipe Extraction Error (Text):', error);
    throw new Error('Failed to extract recipe from text.');
  }
};

export const extractRecipeFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedRecipe> => {
  const prompt = "Extract the recipe details from this image. Provide the title, ingredients organized into sections (e.g., 'Main Ingredients', 'Frosting'), instructions, servings, and any extra tips or notes. Capture ingredients and instructions EXACTLY as written in the image. If an ingredient includes parentheticals or extra context (e.g., '1 large egg (room temperature)', '50g butter, softened', '3 cloves garlic, minced'), extract ONLY the core name ('egg', 'butter', 'garlic') and put the rest ('room temperature', 'softened', 'minced') into the 'note' field. Keep the note field concise. Identify optional flags. Extract any extra tips, notes, or variations provided in the recipe into the 'notes' field.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: getRecipeSchema()
      }
    });

    const cleaned = cleanJsonResponse(response.text || '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini Recipe Extraction Error (Image):', error);
    throw new Error('Failed to extract recipe from image.');
  }
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: getCategorizationSchema()
      }
    });

    const cleaned = cleanJsonResponse(response.text || '');
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
