import { useState } from "react";

const SUGGESTIONS = [
  "🌶️ Make it spicy",
  "🥗 Vegetarian swap",
  "⏱️ Quick 15-min version",
  "🍟 Air fryer instructions",
  "🧀 Extra cheesy",
];

export default function RecipeRefineBar({ onRefine, disabled }) {
  const [instruction, setInstruction] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!instruction.trim() || disabled) return;
    onRefine(instruction.trim());
    setInstruction("");
  }

  function handleSuggestion(text) {
    if (disabled) return;
    onRefine(text.replace(/^[^\w\s]+\s*/, "")); // strip emoji prefix for API prompt
  }

  return (
    <div className="refine-bar">
      <div className="refine-header">
        <h4>Refine this recipe 🔄</h4>
        <span className="refine-tagline">Tweak flavor, cooking method, or dietary fit without starting over</span>
      </div>

      <form onSubmit={handleSubmit} className="refine-form">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g., make it vegan, add garlic butter, reduce cook time..."
          disabled={disabled}
          maxLength={300}
        />
        <button type="submit" disabled={disabled || !instruction.trim()} className="refine-button">
          {disabled ? "Refining..." : "Refine 🪄"}
        </button>
      </form>

      <div className="refine-chips">
        {SUGGESTIONS.map((sug) => (
          <button
            type="button"
            key={sug}
            className="refine-chip"
            onClick={() => handleSuggestion(sug)}
            disabled={disabled}
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}
