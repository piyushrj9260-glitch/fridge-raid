import { useCallback, useRef, useState } from "react";

/**
 * Wraps the /api/recipe & /api/recipe/refine calls with:
 *  - support for multiple recipe option recommendations (`recipes` array)
 *  - an AbortController per request & staleness protection
 */
export function useRecipeGenerator() {
  const [status, setStatus] = useState("idle"); // idle | loading | refining | success | error
  const [recipes, setRecipes] = useState([]);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [error, setError] = useState(null);

  const latestRequestId = useRef(0);
  const abortRef = useRef(null);

  const recipe = recipes[activeOptionIndex] || recipes[0] || null;

  const generate = useCallback(async (ingredients, notes) => {
    const requestId = ++latestRequestId.current;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, notes }),
        signal: controller.signal,
      });

      const isStale = requestId !== latestRequestId.current;

      let body;
      try {
        body = await res.json();
      } catch {
        if (!isStale) {
          setStatus("error");
          setError("The server sent back something that wasn't valid JSON. Please try again.");
        }
        return;
      }

      if (isStale) return;

      if (!res.ok) {
        setStatus("error");
        setError(body?.error || `Something went wrong (${res.status}).`);
        return;
      }

      const list = Array.isArray(body.recipes) && body.recipes.length > 0 ? body.recipes : [body.recipe];
      setRecipes(list);
      setActiveOptionIndex(0);
      setStatus("success");
    } catch (err) {
      if (err.name === "AbortError") return;
      if (requestId !== latestRequestId.current) return;
      setStatus("error");
      setError("Couldn't reach the server. Is it running on :3001?");
    }
  }, []);

  const refine = useCallback(async (currentRecipe, instruction) => {
    if (!currentRecipe || !instruction) return;
    const requestId = ++latestRequestId.current;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("refining");

    try {
      const res = await fetch("/api/recipe/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRecipe, instruction }),
        signal: controller.signal,
      });

      const isStale = requestId !== latestRequestId.current;

      let body;
      try {
        body = await res.json();
      } catch {
        if (!isStale) {
          setStatus("error");
          setError("Failed to parse refinement response.");
        }
        return;
      }

      if (isStale) return;

      if (!res.ok) {
        setStatus("error");
        setError(body?.error || `Refinement failed (${res.status}).`);
        return;
      }

      const updatedRecipe = body.recipe;
      setRecipes((prev) => {
        const next = [...prev];
        next[activeOptionIndex] = updatedRecipe;
        return next;
      });
      setStatus("success");
    } catch (err) {
      if (err.name === "AbortError") return;
      if (requestId !== latestRequestId.current) return;
      setStatus("error");
      setError("Couldn't reach the server for refinement.");
    }
  }, [activeOptionIndex]);

  const selectOptionIndex = useCallback((index) => {
    setActiveOptionIndex(index);
  }, []);

  const setCustomRecipe = useCallback((newRecipe) => {
    if (abortRef.current) abortRef.current.abort();
    setRecipes([newRecipe]);
    setActiveOptionIndex(0);
    setStatus("success");
    setError(null);
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setRecipes([]);
    setActiveOptionIndex(0);
    setError(null);
  }, []);

  return {
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
  };
}
