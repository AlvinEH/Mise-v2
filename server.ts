import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Middleware to verify Firebase Auth token
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Auth Error:", error);
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // API Route to fetch/execute Gemini requests
  app.post("/api/gemini/execute", authenticate, async (req: any, res: any) => {
    const { operation, params } = req.body;
    const userId = req.user.uid;

    try {
      // Fetch user's Gemini key from Firestore
      const userSettingsDoc = await db.collection("users").doc(userId).collection("settings").doc("gemini").get();
      const userData = userSettingsDoc.data();
      const apiKey = userData?.apiKey;

      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key not configured in account settings" });
      }

      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

      let result;
      if (operation === 'generateContent') {
        const { prompt, config } = params;
        
        // Define schemas for specific known prompts if needed
        let generationConfig = { ...config };
        if (prompt.includes("Extract the recipe details")) {
          generationConfig.responseSchema = {
            type: "object",
            properties: {
              title: { type: "string" },
              ingredientSections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          amount: { type: "string" },
                          unit: { type: "string" },
                          note: { type: "string" },
                          isOptional: { type: "boolean" }
                        },
                        required: ["name"]
                      }
                    }
                  },
                  required: ["items"]
                }
              },
              instructions: { type: "string" },
              servings: { type: "string" },
              notes: { type: "string" }
            },
            required: ["title", "ingredientSections", "instructions"]
          };
        } else if (prompt.includes("Categorize the following household/grocery items")) {
          generationConfig.responseSchema = {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                location: { 
                  type: "string", 
                  enum: ['Pantry', 'Freezer', 'Refrigerator', 'Washroom', 'Laundry Room', 'Under Sink', 'Cat Supplies'] 
                },
                category: { 
                  type: "string", 
                  enum: ['ingredient', 'supply'] 
                }
              },
              required: ["name", "location", "category"]
            }
          };
        }

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig
        });
        result = response.response.text();
      } else if (operation === 'generateContentWithImage') {
        const { prompt, imageData, mimeType, config } = params;
        
        let generationConfig = { ...config };
        if (prompt.includes("Extract the recipe details")) {
          generationConfig.responseSchema = {
            type: "object",
            properties: {
              title: { type: "string" },
              ingredientSections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          amount: { type: "string" },
                          unit: { type: "string" },
                          note: { type: "string" },
                          isOptional: { type: "boolean" }
                        },
                        required: ["name"]
                      }
                    }
                  },
                  required: ["items"]
                }
              },
              instructions: { type: "string" },
              servings: { type: "string" },
              notes: { type: "string" }
            },
            required: ["title", "ingredientSections", "instructions"]
          };
        }

        const response = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { data: imageData, mimeType } }
              ]
            }
          ],
          generationConfig
        });
        result = response.response.text();
      }

      res.json({ result });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
