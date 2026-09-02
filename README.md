# Fridge Raid 🧊 → 🍳

> 🌐 **Live Web Application:** [https://piyushrj9260-glitch.github.io/fridge-raid/](https://piyushrj9260-glitch.github.io/fridge-raid/)  
> ⚡ **Live Server API Proxy:** `https://piyushrj9260-glitch.github.io/fridge-raid/` (Local Express server running at `http://localhost:3001/api/recipe`)

Type out whatever's in your fridge (or pantry, or "half an onion and regret"),
and get back actual interactive recipe options — not a wall of chat text. Scale
servings live, swap ingredients you don't have, check off steps as you cook, and
refine flavor/methods on the fly.

**Live idea in one line:** the AI doesn't talk to you, it hands your React app
structured recipe JSON objects, and the UI turns those objects into interactive cooking cards.

## Key Features & What Makes This Unique

Most "AI recipe" demos are a chat box that prints markdown. This one treats
the model's output as **data with a shape**, and the whole UI is built around
that shape being unreliable:

- **Multi-Recipe Dish Recommendations** — enter your fridge inventory and receive 2-3 distinct dish options based on different combinations/subsets of your items (e.g. *Option 1: Aloo Pyaz Masala Sabzi*, *Option 2: Desi Aloo Tamatar Gravy Curry*, *Option 3: Cheesy Aloo Tawa Roast*).
- **Indian Cuisine Focus** — defaults to authentic and modern Indian home-style cooking (Sabzis, Curries, Pulao, Parathas, Bhurji, Tawa Roasts), while supporting custom notes for any global cuisine.
- **Live Serving Scaler** — drag a slider, every ingredient amount and nutrition estimate recalculates in real time (fractions included: "1/2 cup" scales cleanly).
- **Inline Ingredient Swaps** — each ingredient the model isn't fully confident about ships with alternates; tap one to swap it into the recipe card without regenerating anything.
- **Recipe Refinement Loop** — tweak active recipes live ("🌶️ Make it spicy", "🥗 Vegetarian swap", "🍟 Air fryer instructions", "Under 15 minutes") by patching structured recipe JSON objects via `/api/recipe/refine`.
- **Cook Mode (Hands-Free)** — a full-screen step-through view with:
  - Countdown timers parsed automatically from instruction text ("simmer 8 minutes").
  - **Screen Wake Lock** API so phone screens stay awake at the stove.
  - **Text-to-Speech (TTS)** voice readout for hands-free instruction listening.
  - **Web Audio chime alarm** when countdown timers reach 0:00.
- **Four Renderable Block Types** (ingredients, steps, tips, nutrition estimates) so different parts of the response degrade independently — if `tips` or `nutrition` comes back empty or malformed, the card and checklist still render fine.
- **Recipe History & Favorites** — save recipes locally (`localStorage`), bookmark favorites (❤️), and reload past raids from a drawer.
- **Copy & Print Support** — one-tap copy formatted plain text and `@media print` paper recipe card printing.
- **Race-Condition Safe**: if you edit your ingredient list and hit generate again before the first request lands, the stale response is discarded, not rendered over the fresh one.

## Tech Stack

- **Frontend:** React 18 + Vite, hand-rolled CSS (kitchen counter / recipe-card aesthetic, see `frontend/src/index.css`).
- **Backend:** Node + Express proxy (`/api/recipe`, `/api/recipe/refine`). This is the only thing that talks to Gemini — the API key never reaches the browser.
- **Model:** Google Gemini (`gemini-2.0-flash`), called with `responseMimeType: application/json` and an explicit `responseSchema` so the model is constrained to a JSON shape, not just asked nicely for one.

## Project Structure

```
fridge-to-recipe/
├── server/              Express backend (Gemini proxy + validation)
│   ├── index.js         API endpoints (/api/recipe, /api/recipe/refine, /api/health)
│   ├── recipeSchema.js  Shared JSON schema + multi-recipe shape validator
│   ├── package.json
│   └── .env.example
└── frontend/             React app
    ├── src/
    │   ├── App.jsx
    │   ├── hooks/useRecipeGenerator.js   fetch + multi-options + refine + staleness guard
    │   ├── components/    RecipeCard, StepChecklist, ServingScaler,
    │   │                   SwapChip, CookMode, NutritionBlock, RecipeRefineBar,
    │   │                   RecipeHistoryDrawer, LoadingState, ErrorState
    │   └── scaleUtils.js  Fraction & serving math
    └── package.json
```

## Setup & Running

You need a free Gemini API key: https://aistudio.google.com/app/apikey

```bash
# 1. Backend
cd server
cp .env.example .env
# paste your key into .env as GEMINI_API_KEY=...
npm install
npm start          # runs on http://localhost:3001

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev         # runs on http://localhost:5173, proxies /api to :3001
```

`npm install && npm start` works for the backend; the frontend follows the
standard `npm install && npm run dev` (Vite's equivalent of `npm start`) —
noted here since the assignment brief mentions `npm start` specifically and
this repo has two `package.json`s.
