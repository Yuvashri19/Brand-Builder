import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initializer for GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel under Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Generate consistent brand spec and prompt drafts
app.post("/api/brand/spec", async (req, res) => {
  try {
    const { productName, productCategory, description, hexColors, styleNotes } = req.body;

    if (!productName || !description) {
      return res.status(400).json({ error: "Product Name and Description are required." });
    }

    const ai = getAiClient();

    const systemInstruction = 
      "You are a master brand strategist and senior advertising image art director. " +
      "Your goal is to parse a user's product description and generate a highly detailed, consistent, concrete " +
      "visual specification for image generation. " +
      "You must design detailed image prompts for 3 mediums (Billboard, Newspaper, Social Post). " +
      "IMPORTANT RULES:\n" +
      "1. Maintain extreme design and product feature description consistency across all prompts (exact colors, materials, branding shapes, logos, physical characteristics, finishes, texture details).\n" +
      "2. Absolutely under no circumstances are humans, people, hands, faces, crowds, or silhouettes allowed in any part of the scene. The visual prompts should emphasize pristine studio layouts or empty outdoor settings focusing strictly and solely on the product object itself.\n" +
      "3. Use evocative, descriptive language optimized for text-to-image models.";

    const promptText = `
      Please analyze this product to establish a consistent brand specifications profile and generate image prompts for Billboard, Newspaper, and Social Post.

      Product Name: "${productName}"
      Category/type: "${productCategory || "Product"}"
      Description: "${description}"
      Brand Color scheme: "${hexColors || "Default harmonious colors"}"
      Style details/mood: "${styleNotes || "Clean, high-end, premium"}"

      Provide the complete result in JSON format matching the schema requested.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["brandMasterSpec", "tagline", "mediums"],
          properties: {
            brandMasterSpec: {
              type: Type.STRING,
              description: "A highly descriptive paragraphs detailing a consistent, repeatable physical specification of the product. Includes exact geometry, materials (e.g. brushed steel, matte finish, textured polycarbonate), specific logotype placement described in text, color palette highlights. This master spec will be embedded into image prompts to ensure consistency."
            },
            tagline: {
              type: Type.STRING,
              description: "A short, catchy, premium advertising headline or tagline generated for the product."
            },
            mediums: {
              type: Type.ARRAY,
              description: "Structured prompt drafts for the three required mediums.",
              items: {
                type: Type.OBJECT,
                required: ["id", "name", "aspectRatio", "targetPrompt", "creativeDirection"],
                properties: {
                  id: { type: Type.STRING, description: "One of 'billboard', 'newspaper', 'social'" },
                  name: { type: Type.STRING, description: "Name of the medium" },
                  aspectRatio: { type: Type.STRING, description: "Default aspect ratio, e.g., '16:9', '1:1', '3:4', '4:3', '9:16'" },
                  targetPrompt: { 
                    type: Type.STRING, 
                    description: "The complete, detailed visual image prompt for this medium. Must combine the product specification with the medium's unique scenery. Must explicitly and clearly repeat the visual properties from brandMasterSpec, and strictly end with negative directions: 'Strictly empty scene, no people, no humans, no hands, no crowd.'" 
                  },
                  creativeDirection: {
                    type: Type.STRING,
                    description: "Brief explanation of why this creative shot fits the medium beautifully."
                  }
                }
              }
            }
          }
        }
      }
    });

    const specData = JSON.parse(response.text || "{}");
    res.json(specData);
  } catch (error: any) {
    console.error("Error generating brand spec:", error);
    res.status(500).json({ error: error.message || "Failed to generate brand specification." });
  }
});

// 2. Generate custom prompt based on master brand spec
app.post("/api/brand/custom-prompt", async (req, res) => {
  try {
    const { brandMasterSpec, customMedium, aspectRatio } = req.body;

    if (!brandMasterSpec || !customMedium) {
      return res.status(400).json({ error: "Master Brand Specification and Custom Medium description are required." });
    }

    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `
        You are a senior brand art director.
        Using the master visual product specification below:
        "${brandMasterSpec}"

        Generate a high-quality visual prompt for a new advertising medium: "${customMedium}".
        The suggested aspect ratio is: "${aspectRatio || "1:1"}".

        Return a JSON object containing the fields: "name", "aspectRatio", "targetPrompt" and "creativeDirection".
        
        CRITICAL RULES:
        1. Maintain total product appearance consistency with the master spec (geometry, logo, colors, material finishes).
        2. Strictly under no circumstances include any people, spectators, silhouettes, hands, or human gestures. The scene must be fully empty and pristine, focused solely on the product.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["name", "aspectRatio", "targetPrompt", "creativeDirection"],
          properties: {
            name: { type: Type.STRING, description: "Formal name of the medium" },
            aspectRatio: { type: Type.STRING, description: "The aspect ratio, e.g. 16:9, 1:1, 3:4, etc." },
            targetPrompt: { type: Type.STRING, description: "The full, rich image prompt incorporating master spec features and the new environment/medium style. Must clearly specify 'No people, no hands, vacant scene' as negative prompts." },
            creativeDirection: { type: Type.STRING, description: "Artistic rationale for the prompt composition." }
          }
        }
      }
    });

    const customMediumData = JSON.parse(response.text || "{}");
    res.json(customMediumData);
  } catch (error: any) {
    console.error("Error generating custom prompt:", error);
    res.status(500).json({ error: error.message || "Failed to generate prompt for custom medium." });
  }
});

// 3. Generate image using the specified Nano-Banana model
app.post("/api/brand/generate-shot", async (req, res) => {
  try {
    const { prompt, aspectRatio, modelType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAiClient();

    // Map user selected model identifier to actual @google/genai model name.
    // Default model requested is `'gemini-2.5-flash-image'` (classic "nano banana")
    const modelName = modelType === "gemini-3.1-flash-image" ? "gemini-3.1-flash-image" : "gemini-2.5-flash-image";

    console.log(`Generating image using model: ${modelName} and aspect ratio: ${aspectRatio || "1:1"}`);

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio || "1:1",
      }
    };

    // If using gemini-3.1-flash-image, we can request 1K scale. Wait, let's keep it safe.
    if (modelName === "gemini-3.1-flash-image") {
      config.imageConfig.imageSize = "1K";
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config,
    });

    let base64Image = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      // Sometimes models might output markdown text explanation of safety errors. Let's inspect
      let explanation = "";
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) explanation += part.text + " ";
        }
      }
      return res.status(500).json({
        error: "No image details returned. The model might have triggered content boundaries, please refine your description.",
        explanation: explanation.trim()
      });
    }

    res.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
    });

  } catch (error: any) {
    console.error("Error generating shot:", error);
    res.status(500).json({ error: error.message || "Failed to generate image." });
  }
});

// Serve assets & fallback paths in dev and production
async function start() {
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
    console.log(`Brand Builder custom server actively listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start full stack host server:", err);
});
