export default function RecipeHistoryDrawer({
  history,
  onSelectRecipe,
  onToggleFavorite,
  onDeleteRecipe,
  onClearHistory,
  onClose,
}) {
  return (
    <div className="drawer-overlay" role="dialog" aria-modal="true">
      <div className="drawer-card">
        <div className="drawer-header">
          <h3>Saved & Recent Raids 📚</h3>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <div className="drawer-empty">
            <p>No saved recipes yet!</p>
            <p className="subtext">Recipes you generate will appear here automatically.</p>
          </div>
        ) : (
          <>
            <div className="drawer-actions">
              <button type="button" className="clear-button" onClick={onClearHistory}>
                Clear history
              </button>
            </div>

            <ul className="history-list">
              {history.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="history-info" onClick={() => onSelectRecipe(item.recipe)}>
                    <span className="history-title">{item.recipe.title}</span>
                    <span className="history-meta">
                      {item.recipe.servings} servings • {item.recipe.ingredients?.length || 0} ingredients
                    </span>
                  </div>

                  <div className="history-controls">
                    <button
                      type="button"
                      className={`fav-button ${item.isFavorite ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      title={item.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      {item.isFavorite ? "❤️" : "🤍"}
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRecipe(item.id);
                      }}
                      title="Delete from history"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
