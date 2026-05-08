import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

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

  // API routes
  // API Route to fetch/execute Gemini requests
  app.post("/api/gemini/execute", authenticate, async (req: any, res: any) => {
    const { operation, params } = req.body;
    const userId = req.user.uid;

    try {
      // Use system API key by default
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
        console.error("[Gemini Proxy] Missing or invalid GEMINI_API_KEY on server.");
        return res.status(400).json({ error: "Gemini API key not configured correctly on server" });
      }

      console.log(`[Gemini Proxy] Initializing with key length: ${apiKey.length}`);
      const ai = new GoogleGenAI({ apiKey });
      
      let result;
      if (operation === 'generateContent') {
        const { prompt, config } = params;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview", // Use correct model for @google/genai SDK
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: config
        });
        result = response.text;
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
