export const singleRecipeProperties = {
  title: { type: "string" },
  description: { type: "string" },
  servings: { type: "integer" },
  prepTimeMinutes: { type: "integer" },
  cookTimeMinutes: { type: "integer" },
  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
  ingredients: {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        amount: { type: "number" },
        unit: { type: "string" },
        notes: { type: "string" },
        swaps: { type: "array", items: { type: "string" } },
      },
      required: ["name"],
    },
  },
  steps: {
    type: "array",
    items: {
      type: "object",
      properties: {
        order: { type: "integer" },
        instruction: { type: "string" },
      },
      required: ["order", "instruction"],
    },
  },
  tips: { type: "array", items: { type: "string" } },
  nutrition: {
    type: "object",
    properties: {
      calories: { type: "integer" },
      proteinGrams: { type: "integer" },
      carbsGrams: { type: "integer" },
      fatGrams: { type: "integer" },
    },
  },
};

export const geminiResponseSchema = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: singleRecipeProperties,
        required: ["title", "servings", "ingredients", "steps"],
      },
    },
  },
  required: ["recipes"],
};

export function sanitizeSingleRecipe(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.title !== "string" || raw.title.trim().length === 0) return null;
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0) return null;
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) return null;

  const badIngredient = raw.ingredients.find(
    (ing) => !ing || typeof ing.name !== "string" || ing.name.trim().length === 0
  );
  if (badIngredient) return null;

  const badStep = raw.steps.find(
    (s) => !s || typeof s.instruction !== "string" || s.instruction.trim().length === 0
  );
  if (badStep) return null;

  let nutrition = null;
  if (raw.nutrition && typeof raw.nutrition === "object") {
    const calories = Number.isFinite(raw.nutrition.calories) && raw.nutrition.calories >= 0 ? Math.round(raw.nutrition.calories) : null;
    const proteinGrams = Number.isFinite(raw.nutrition.proteinGrams) && raw.nutrition.proteinGrams >= 0 ? Math.round(raw.nutrition.proteinGrams) : null;
    const carbsGrams = Number.isFinite(raw.nutrition.carbsGrams) && raw.nutrition.carbsGrams >= 0 ? Math.round(raw.nutrition.carbsGrams) : null;
    const fatGrams = Number.isFinite(raw.nutrition.fatGrams) && raw.nutrition.fatGrams >= 0 ? Math.round(raw.nutrition.fatGrams) : null;

    if (calories != null || proteinGrams != null || carbsGrams != null || fatGrams != null) {
      nutrition = { calories, proteinGrams, carbsGrams, fatGrams };
    }
  }

  return {
    title: raw.title.trim(),
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    servings: Number.isFinite(raw.servings) && raw.servings > 0 ? Math.round(raw.servings) : 4,
    prepTimeMinutes: Number.isFinite(raw.prepTimeMinutes) ? Math.max(0, Math.round(raw.prepTimeMinutes)) : null,
    cookTimeMinutes: Number.isFinite(raw.cookTimeMinutes) ? Math.max(0, Math.round(raw.cookTimeMinutes)) : null,
    difficulty: ["easy", "medium", "hard"].includes(raw.difficulty) ? raw.difficulty : null,
    ingredients: raw.ingredients.map((ing, i) => ({
      id: `ing-${i}`,
      name: ing.name.trim(),
      amount: Number.isFinite(ing.amount) && ing.amount > 0 ? ing.amount : null,
      unit: typeof ing.unit === "string" && ing.unit.trim() ? ing.unit.trim() : null,
      notes: typeof ing.notes === "string" && ing.notes.trim() ? ing.notes.trim() : null,
      swaps: Array.isArray(ing.swaps)
        ? ing.swaps.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
        : [],
    })),
    steps: raw.steps
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s, i) => ({
        id: `step-${i}`,
        order: i + 1,
        instruction: s.instruction.trim(),
      })),
    tips: Array.isArray(raw.tips)
      ? raw.tips.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
      : [],
    nutrition,
  };
}

export function validateRecipeShape(raw) {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "Response was not a JSON object." };
  }

  // Support array of recipes
  if (Array.isArray(raw.recipes) && raw.recipes.length > 0) {
    const validRecipes = raw.recipes.map(sanitizeSingleRecipe).filter(Boolean);
    if (validRecipes.length === 0) {
      return { valid: false, reason: "No valid recipes were returned in the recipes array." };
    }
    return { valid: true, recipes: validRecipes, recipe: validRecipes[0] };
  }

  // Fallback to single recipe object
  const single = sanitizeSingleRecipe(raw);
  if (!single) {
    return { valid: false, reason: "Recipe object failed shape validation." };
  }

  return { valid: true, recipes: [single], recipe: single };
}
