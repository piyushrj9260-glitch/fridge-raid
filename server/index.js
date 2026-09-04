import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { geminiResponseSchema, validateRecipeShape } from "./recipeSchema.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REQUEST_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 3;

const SYSTEM_PROMPT = `You are a creative recipe generator for a "fridge raid" cooking app, specializing primarily in INDIAN CUISINE (Sabzis, Curries, Biryani/Pulao, Parathas, Bhurji, Tadka, Kadhai dishes, Chaats, etc.).
Given a free-form list of ingredients provided by the user, invent exactly 1 creative Indian-inspired recipe using the ingredients present in their fridge/pantry.

Rules:
- Primary cuisine focus: Authentic or modern Indian home-style cooking (unless user explicitly requests a non-Indian cuisine in notes).
- Return ONLY the JSON object matching the schema with a "recipes" array containing exactly 1 recipe object. No prose, no markdown fences.
- For the recipe object:
  - Provide a distinct Indian dish title (e.g. "Aloo Matar Sabzi", "Masala Egg Bhurji") and a brief description explaining its flavor profile and fridge ingredients used.
  - ingredients: 3-12 items with realistic amounts and units (e.g. "cup", "tbsp", "g", "clove", "tsp"). Basic Indian pantry staples (oil/ghee, salt, turmeric, chili, cumin/mustard seeds, water) are assumed. Include 1-3 reasonable "swaps".
  - steps: 3-8 steps with explicit cooking durations (e.g. "Sauté onions for 5 minutes", "Simmer curry for 10 minutes") for step timers.
  - tips: 0-2 short optional tips (e.g. serving with roti/rice, tempering tips).
  - servings: sensible integer quantity.
  - nutrition: realistic per-serving estimates for calories, proteinGrams, carbsGrams, and fatGrams.
- Each time you are called, pick a DIFFERENT dish style randomly. Vary between sabzis, curries, pulao, parathas, bhurji, tawa dishes, etc.`;

async function callGeminiWithRetry(userPrompt) {
  let lastReason = "Unknown error.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const promptForAttempt =
        attempt === 1
          ? userPrompt
          : `${userPrompt}\n\n(Your previous response was invalid: ${lastReason} Return strictly valid JSON matching the schema this time — no markdown fences, no trailing commas, no missing required fields.)`;

      console.log(`[Attempt ${attempt}] Calling Gemini model: ${GEMINI_MODEL}`);
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: promptForAttempt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: geminiResponseSchema,
              temperature: 0.85,
            },
          }),
        }
      );

      clearTimeout(timeout);

      if (!geminiRes.ok) {
        const body = await geminiRes.text().catch(() => "");
        lastReason = `Model API returned ${geminiRes.status}.`;
        console.error("Gemini API error:", geminiRes.status, body.slice(0, 500));
        if (geminiRes.status < 500 && geminiRes.status !== 429) {
          return { error: "The model rejected the request. Try rephrasing your prompt.", statusCode: 502 };
        }
        continue;
      }

      const payload = await geminiRes.json();
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastReason = "Model returned no content (may have been blocked by safety filters).";
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        lastReason = "Response was not valid JSON.";
        continue;
      }

      const { valid, recipes, recipe, reason } = validateRecipeShape(parsed);
      if (!valid) {
        lastReason = reason;
        continue;
      }

      return { recipe, recipes };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        lastReason = "Request timed out.";
      } else {
        lastReason = "Network error reaching the model.";
        console.error("Fetch error:", err);
      }
    }
  }

  return {
    error: `Couldn't get usable recipes after ${MAX_ATTEMPTS} tries (${lastReason}). Please try again.`,
    statusCode: 502,
  };
}

app.post("/api/recipe", async (req, res) => {
  const { ingredients, notes } = req.body ?? {};

  if (typeof ingredients !== "string" || ingredients.trim().length === 0) {
    return res.status(400).json({ error: "Tell me what's in your fridge first." });
  }
  if (ingredients.length > 1000) {
    return res.status(400).json({ error: "That's a long fridge. Try trimming it to the essentials." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Server is missing GEMINI_API_KEY. Copy server/.env.example to server/.env and add your key.",
    });
  }

  const userPrompt = `Ingredients on hand: ${ingredients.trim()}${
    notes && typeof notes === "string" && notes.trim() ? `\nAdditional notes: ${notes.trim()}` : ""
  }`;

  const result = await callGeminiWithRetry(userPrompt);
  if (result.error) {
    return res.status(result.statusCode || 502).json({ error: result.error });
  }

  return res.json({ recipe: result.recipe, recipes: result.recipes || [result.recipe] });
});

app.post("/api/recipe/refine", async (req, res) => {
  const { currentRecipe, instruction } = req.body ?? {};

  if (!currentRecipe || typeof currentRecipe !== "object") {
    return res.status(400).json({ error: "Missing current recipe to refine." });
  }
  if (typeof instruction !== "string" || instruction.trim().length === 0) {
    return res.status(400).json({ error: "Please tell me how you want to refine this recipe." });
  }
  if (instruction.length > 500) {
    return res.status(400).json({ error: "Refinement instruction is too long." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Server is missing GEMINI_API_KEY. Copy server/.env.example to server/.env and add your key.",
    });
  }

  const userPrompt = `Current recipe JSON:
${JSON.stringify(currentRecipe)}

Refinement request: ${instruction.trim()}

Instructions for update:
Modify the current recipe according to the user request. Retain the core dish concept, but adapt ingredients, steps, tips, and nutrition to fulfill the request cleanly.`;

  const result = await callGeminiWithRetry(userPrompt);
  if (result.error) {
    return res.status(result.statusCode || 502).json({ error: result.error });
  }

  return res.json({ recipe: result.recipe, recipes: result.recipes || [result.recipe] });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Fridge-to-recipe server listening on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY not set — /api/recipe will return 500 until you set it in server/.env");
  }
});
