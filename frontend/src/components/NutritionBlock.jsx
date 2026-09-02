export default function NutritionBlock({ nutrition, originalServings, displayServings }) {
  if (!nutrition || typeof nutrition !== "object") return null;

  const { calories, proteinGrams, carbsGrams, fatGrams } = nutrition;
  if (calories == null && proteinGrams == null && carbsGrams == null && fatGrams == null) {
    return null;
  }

  const scale = originalServings && displayServings ? displayServings / originalServings : 1;

  const scaledCal = calories != null ? Math.round(calories * scale) : null;
  const scaledProtein = proteinGrams != null ? Math.round(proteinGrams * scale) : null;
  const scaledCarbs = carbsGrams != null ? Math.round(carbsGrams * scale) : null;
  const scaledFat = fatGrams != null ? Math.round(fatGrams * scale) : null;

  return (
    <section className="recipe-block nutrition-block">
      <h3>Nutrition Estimates <span className="nutrition-subtitle">(per {displayServings} serving{displayServings > 1 ? "s" : ""})</span></h3>
      <div className="nutrition-grid">
        {scaledCal != null && (
          <div className="nutrition-badge cal">
            <span className="val">{scaledCal}</span>
            <span className="lbl">Calories (kcal)</span>
          </div>
        )}
        {scaledProtein != null && (
          <div className="nutrition-badge protein">
            <span className="val">{scaledProtein}g</span>
            <span className="lbl">Protein</span>
          </div>
        )}
        {scaledCarbs != null && (
          <div className="nutrition-badge carbs">
            <span className="val">{scaledCarbs}g</span>
            <span className="lbl">Carbs</span>
          </div>
        )}
        {scaledFat != null && (
          <div className="nutrition-badge fat">
            <span className="val">{scaledFat}g</span>
            <span className="lbl">Fat</span>
          </div>
        )}
      </div>
    </section>
  );
}
