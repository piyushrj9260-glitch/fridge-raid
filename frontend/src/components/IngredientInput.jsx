import { useState } from "react";

const EXAMPLES = [
  "potatoes, tomatoes, onion, cheese, garlic",
  "paneer, spinach, tomatoes, onion, ginger, garlic",
  "chicken, rice, onion, garlic, tomatoes, curd",
];

export default function IngredientInput({ onSubmit, disabled }) {
  const [ingredients, setIngredients] = useState("");
  const [notes, setNotes] = useState("Indian style");

  function handleSubmit(e) {
    e.preventDefault();
    if (!ingredients.trim() || disabled) return;
    onSubmit(ingredients, notes);
  }

  function fillExample(example) {
    setIngredients(example);
  }

  return (
    <form className="ingredient-form" onSubmit={handleSubmit}>
      <label htmlFor="ingredients">What's in your fridge & pantry?</label>
      <p className="ingredient-hint">
        List your ingredients — I'll suggest authentic Indian cuisine options (Sabzis, Curries, Pulao, Parathas, Bhurji)!
      </p>
      <textarea
        id="ingredients"
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        placeholder="potatoes, tomatoes, onion, paneer/cheese, garlic, spinach..."
        rows={3}
        disabled={disabled}
        maxLength={1000}
      />

      <label htmlFor="notes" className="notes-label">
        Dietary style / Vibes <span className="optional">(optional)</span>
      </label>
      <input
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Indian style, Dhaba style, spicy, Jain, quick 15-min..."
        disabled={disabled}
        maxLength={200}
      />

      <div className="examples">
        <span className="examples-label">Try Indian fridge raids:</span>
        {EXAMPLES.map((ex) => (
          <button
            type="button"
            key={ex}
            className="example-chip"
            onClick={() => fillExample(ex)}
            disabled={disabled}
          >
            {ex}
          </button>
        ))}
      </div>

      <button type="submit" className="raid-button" disabled={disabled || !ingredients.trim()}>
        {disabled ? "Raiding the fridge…" : "Raid the fridge 🧊"}
      </button>
    </form>
  );
}
