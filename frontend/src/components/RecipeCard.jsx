import { useState } from "react";
import ServingScaler from "./ServingScaler.jsx";
import SwapChip from "./SwapChip.jsx";
import NutritionBlock from "./NutritionBlock.jsx";
import RecipeRefineBar from "./RecipeRefineBar.jsx";
import { formatAmount, scaleAmount } from "../scaleUtils.js";

export default function RecipeCard({
  recipe,
  onTryDifferent,
  displayServings,
  onServingsChange,
  onSwapIngredient,
  onRefine,
  isRefining,
  isFavorite,
  onToggleFavorite,
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!recipe) return;
    const text = [
      `🍽️ ${recipe.title}`,
      recipe.description ? `${recipe.description}\n` : "",
      `Servings: ${displayServings}`,
      recipe.prepTimeMinutes ? `Prep time: ${recipe.prepTimeMinutes}m` : "",
      recipe.cookTimeMinutes ? `Cook time: ${recipe.cookTimeMinutes}m` : "",
      "\n--- INGREDIENTS ---",
      ...recipe.ingredients.map((ing) => {
        const scaled = scaleAmount(ing.amount, recipe.servings, displayServings);
        const formatted = formatAmount(scaled);
        const amtStr = formatted != null ? `${formatted}${ing.unit ? " " + ing.unit : ""}` : "";
        return `• ${amtStr ? amtStr + " " : ""}${ing.name}${ing.notes ? ` (${ing.notes})` : ""}`;
      }),
      "\n--- INSTRUCTIONS ---",
      ...recipe.steps.map((s) => `${s.order}. ${s.instruction}`),
      recipe.tips && recipe.tips.length > 0 ? `\n--- TIPS ---\n${recipe.tips.map((t) => `• ${t}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="recipe-card">
      {/* Try different recipe button */}
      {onTryDifferent && (
        <div className="recipe-options-tabs">
          <button
            type="button"
            className="option-tab try-different-btn"
            onClick={onTryDifferent}
            disabled={isRefining}
          >
            🔄 Try Different Recipe
          </button>
        </div>
      )}

      <header className="recipe-header">
        <div className="recipe-title-row">
          <h2>{recipe.title}</h2>
          <div className="card-actions">
            <button
              type="button"
              className={`action-icon-button ${isFavorite ? "active" : ""}`}
              onClick={onToggleFavorite}
              title={isFavorite ? "Unfavorite recipe" : "Save as favorite"}
            >
              {isFavorite ? "❤️" : "🤍"}
            </button>
            <button
              type="button"
              className="action-icon-button"
              onClick={handleCopy}
              title="Copy formatted recipe"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <button
              type="button"
              className="action-icon-button"
              onClick={() => window.print()}
              title="Print recipe"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {recipe.description && <p className="recipe-description">{recipe.description}</p>}

        <div className="recipe-meta">
          {recipe.difficulty && <span className="meta-pill">{recipe.difficulty}</span>}
          {recipe.prepTimeMinutes != null && (
            <span className="meta-pill">{recipe.prepTimeMinutes}m prep</span>
          )}
          {recipe.cookTimeMinutes != null && (
            <span className="meta-pill">{recipe.cookTimeMinutes}m cook</span>
          )}
        </div>
      </header>

      <ServingScaler servings={displayServings} onChange={onServingsChange} />

      {/* Block 1: Ingredients */}
      <section className="recipe-block">
        <h3>Ingredients</h3>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ing) => {
            const scaled = scaleAmount(ing.amount, recipe.servings, displayServings);
            const formatted = formatAmount(scaled);
            return (
              <li key={ing.id} className="ingredient-row">
                <span className="ingredient-amount">
                  {formatted != null ? `${formatted}${ing.unit ? " " + ing.unit : ""}` : ""}
                </span>
                <span className="ingredient-name">
                  {ing.name}
                  {ing.notes && <span className="ingredient-notes"> ({ing.notes})</span>}
                </span>
                <SwapChip swaps={ing.swaps} onSwap={(swap) => onSwapIngredient(ing.id, swap)} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Block 2: Nutrition estimates block — renders independently */}
      <NutritionBlock
        nutrition={recipe.nutrition}
        originalServings={recipe.servings}
        displayServings={displayServings}
      />

      {/* Block 3: Tips — renders independently, degrades gracefully if empty */}
      {recipe.tips && recipe.tips.length > 0 && (
        <section className="recipe-block tips-block">
          <h3>Tips</h3>
          <ul className="tips-list">
            {recipe.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Refinement Bar for live prompt adjustments */}
      {onRefine && <RecipeRefineBar onRefine={onRefine} disabled={isRefining} />}
    </div>
  );
}
