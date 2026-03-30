import { GoogleGenAI, Type } from "@google/genai";

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface ExtractedRecipe {
  title: string;
  ingredients: (string | Ingredient)[];
  instructions: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "The name of the recipe"
    },
    ingredients: { 
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of ingredients with their quantities"
    },
    instructions: {
      type: Type.STRING,
      description: "A step-by-step list of instructions in markdown format"
    }
  },
  required: ["title", "ingredients", "instructions"]
};

export async function extractRecipeFromUrl(url: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the recipe details (title, ingredients, and instructions) from this URL: ${url}. 
      If the URL is not a recipe, try to find the most relevant food-related information or return an error-like title.`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting recipe:", error);
    throw error;
  }
}
