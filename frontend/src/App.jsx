import { useEffect, useMemo, useState } from "react";
import IngredientInput from "./components/IngredientInput.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ErrorState from "./components/ErrorState.jsx";
import RecipeCard from "./components/RecipeCard.jsx";
import StepChecklist from "./components/StepChecklist.jsx";
import CookMode from "./components/CookMode.jsx";
import RecipeHistoryDrawer from "./components/RecipeHistoryDrawer.jsx";
import { useRecipeGenerator } from "./hooks/useRecipeGenerator.js";

const STORAGE_KEY = "FRIDGE_RAID_HISTORY_V1";

export default function App() {
  const {
    status,
    recipes,
    recipe,
    activeOptionIndex,
    selectOptionIndex,
    error,
    generate,
    refine,
    setCustomRecipe,
    reset,
  } = useRecipeGenerator();

  const [lastSubmission, setLastSubmission] = useState(null);
  const [displayServings, setDisplayServings] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState(new Set());
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [swappedIngredients, setSwappedIngredients] = useState({});
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // LocalStorage history state
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }, [history]);

  // When active recipe changes, update state & save to history
  useEffect(() => {
    if (recipe) {
      setDisplayServings(recipe.servings);
      setCheckedSteps(new Set());
      setSwappedIngredients({});

      setHistory((prev) => {
        const existingIdx = prev.findIndex((item) => item.recipe.title === recipe.title);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], recipe, timestamp: Date.now() };
          return updated;
        }
        const newItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          recipe,
          timestamp: Date.now(),
          isFavorite: false,
        };
        return [newItem, ...prev.slice(0, 19)];
      });
    }
  }, [recipe]);

  function handleSubmit(ingredients, notes) {
    setLastSubmission({ ingredients, notes });
    generate(ingredients, notes);
  }

  function handleRetry() {
    if (lastSubmission) generate(lastSubmission.ingredients, lastSubmission.notes);
  }

  function toggleStep(stepId) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  }

  function swapIngredient(ingredientId, newName) {
    setSwappedIngredients((prev) => ({ ...prev, [ingredientId]: newName }));
  }

  function handleRefine(instruction) {
    if (recipe) {
      refine(recipe, instruction);
    }
  }

  function handleToggleFavorite(itemId) {
    setHistory((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  }

  function toggleCurrentFavorite() {
    if (!recipe) return;
    setHistory((prev) => {
      const item = prev.find((i) => i.recipe.title === recipe.title);
      if (item) {
        return prev.map((i) => (i.id === item.id ? { ...i, isFavorite: !i.isFavorite } : i));
      }
      return [
        {
          id: `hist-${Date.now()}`,
          recipe,
          timestamp: Date.now(),
          isFavorite: true,
        },
        ...prev,
      ];
    });
  }

  function handleDeleteRecipe(itemId) {
    setHistory((prev) => prev.filter((item) => item.id !== itemId));
  }

  function handleClearHistory() {
    if (window.confirm("Are you sure you want to clear your saved recipe history?")) {
      setHistory([]);
    }
  }

  function handleSelectRecipe(savedRecipe) {
    setCustomRecipe(savedRecipe);
    setHistoryDrawerOpen(false);
  }

  const currentHistoryItem = useMemo(() => {
    if (!recipe) return null;
    return history.find((h) => h.recipe.title === recipe.title);
  }, [recipe, history]);

  const displayedRecipe = useMemo(() => {
    if (!recipe) return null;
    if (Object.keys(swappedIngredients).length === 0) return recipe;
    return {
      ...recipe,
      ingredients: recipe.ingredients.map((ing) =>
        swappedIngredients[ing.id] ? { ...ing, name: swappedIngredients[ing.id], swaps: [] } : ing
      ),
    };
  }, [recipe, swappedIngredients]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-top">
          <h1>Fridge Raid 🧊</h1>
          <button
            type="button"
            className="history-trigger-button"
            onClick={() => setHistoryDrawerOpen(true)}
            title="Saved & Recent Recipes"
          >
            📚 Saved ({history.length})
          </button>
        </div>
        <p className="tagline">Turn what's on hand into a recipe you can actually cook from.</p>
      </header>

      <main>
        <IngredientInput
          onSubmit={handleSubmit}
          disabled={status === "loading" || status === "refining"}
        />

        {status === "loading" && <LoadingState message="Raiding the fridge & crafting recipe options…" />}
        {status === "refining" && <LoadingState message="Refining your recipe according to instructions…" />}

        {status === "error" && <ErrorState message={error} onRetry={handleRetry} />}

        {status === "success" && displayedRecipe && (
          <>
            <RecipeCard
              recipe={displayedRecipe}
              recipes={recipes}
              activeOptionIndex={activeOptionIndex}
              onSelectOptionIndex={selectOptionIndex}
              displayServings={displayServings}
              onServingsChange={setDisplayServings}
              onSwapIngredient={swapIngredient}
              onRefine={handleRefine}
              isRefining={status === "refining"}
              isFavorite={currentHistoryItem?.isFavorite ?? false}
              onToggleFavorite={toggleCurrentFavorite}
            />
            <StepChecklist
              steps={displayedRecipe.steps}
              checkedSteps={checkedSteps}
              onToggle={toggleStep}
              onEnterCookMode={() => setCookModeOpen(true)}
            />
            <button type="button" className="start-over-button" onClick={reset}>
              Raid the fridge again 🧊
            </button>
          </>
        )}

        {status === "idle" && (
          <div className="empty-state">
            <p>No recipe yet — list what you've got above and I'll build options around it.</p>
          </div>
        )}
      </main>

      {cookModeOpen && displayedRecipe && (
        <CookMode steps={displayedRecipe.steps} onClose={() => setCookModeOpen(false)} />
      )}

      {historyDrawerOpen && (
        <RecipeHistoryDrawer
          history={history}
          onSelectRecipe={handleSelectRecipe}
          onToggleFavorite={handleToggleFavorite}
          onDeleteRecipe={handleDeleteRecipe}
          onClearHistory={handleClearHistory}
          onClose={() => setHistoryDrawerOpen(false)}
        />
      )}
    </div>
  );
}
