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
  servings?: string;
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
      description: "A step-by-step list of instructions in markdown format. Use numbered lists (1., 2., etc.) for each step. Ensure each step is clearly separated by a double line break."
    },
    servings: {
      type: Type.STRING,
      description: "The number of servings or yield of the recipe (e.g., '4', 'Serves 6', '12 cookies'). If not found, return an empty string."
    }
  },
  required: ["title", "ingredients", "instructions"]
};

export async function extractRecipeFromUrl(url: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the recipe details (title, ingredients, and instructions) from this URL: ${url}. 
      Format the instructions as a clear, numbered list in Markdown. Ensure there is a double line break between each step for readability.
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

export async function extractRecipeFromImage(base64Data: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "Extract the recipe details (title, ingredients, instructions, and servings) from this image. Format the instructions as a clear, numbered list in Markdown with double line breaks between steps. Return the result in JSON format.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting recipe from image:", error);
    throw error;
  }
}
