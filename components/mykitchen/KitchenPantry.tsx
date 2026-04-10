"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, Minus, ScanLine } from "lucide-react";

type Unit = "units" | "oz" | "lbs" | "cups" | "tbsp" | "gal";
type Category =
  | "Fruits"
  | "Vegetables"
  | "Spices"
  | "Grains"
  | "Dairy"
  | "Proteins"
  | "Herbs"
  | "Pantry Staples"
  | "Condiments & Sauces"
  | "Nuts & Seeds";

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Ingredient {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: Unit;
  imageUrl: string;
  emoji: string;
  macros: Macros;
  substitution: string;
}

const CATEGORIES: Category[] = [
  "Fruits",
  "Vegetables",
  "Spices",
  "Grains",
  "Dairy",
  "Proteins",
  "Herbs",
  "Pantry Staples",
  "Condiments & Sauces",
  "Nuts & Seeds",
];

const INITIAL_INGREDIENTS: Ingredient[] = [];

const SEARCH_POOL: Omit<Ingredient, "id">[] = [];

const PREVIEW_COUNT = 4;

function IngredientCard({
  item,
  onAdjust,
}: {
  item: Ingredient;
  onAdjust: (id: string, delta: number) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-[150px] shrink-0 [perspective:800px]">
      <div
        className={`relative h-[210px] w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center rounded-3xl bg-[#063643] pb-4 pt-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-5xl overflow-hidden">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span role="img" aria-label={item.name}>{item.emoji}</span>
            )}
          </div>
          <p className="mt-2.5 text-sm font-semibold text-white text-center leading-tight px-2">
            {item.name}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            {item.quantity} {item.unit}
          </p>
          <div
            className="mt-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`Increase ${item.name}`}
              onClick={() => onAdjust(item.id, 1)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white hover:bg-white/20 transition"
            >
              <Plus className="h-3 w-3" />
            </button>
            <div className="h-3 w-px bg-white/30" />
            <button
              type="button"
              aria-label={`Decrease ${item.name}`}
              onClick={() => onAdjust(item.id, -1)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white hover:bg-white/20 transition"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col rounded-3xl bg-[#063643] p-3 text-white">
          <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
            <span className="text-xl leading-none">{item.emoji}</span>
            <p className="text-xs font-bold leading-tight truncate">{item.name}</p>
          </div>
          <div className="mt-2 flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">🔥 Calories</span>
              <span className="text-[10px] font-semibold">{item.macros.calories}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">💪 Protein</span>
              <span className="text-[10px] font-semibold">{item.macros.protein}g</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">🌾 Carbs</span>
              <span className="text-[10px] font-semibold">{item.macros.carbs}g</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">🥑 Fat</span>
              <span className="text-[10px] font-semibold">{item.macros.fat}g</span>
            </div>
          </div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="text-[9px] uppercase tracking-wide text-white/40 mb-0.5">Substitute</p>
            <p className="text-[10px] font-semibold text-white/90 truncate">{item.substitution}</p>
          </div>
          <p className="mt-1.5 text-center text-[8px] text-white/25">tap to flip back</p>
        </div>
      </div>
    </div>
  );
}

export default function KitchenPantry() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // FAB search state (search existing ingredients only)
  const [fabOpen, setFabOpen] = useState(false);
  const [fabQuery, setFabQuery] = useState("");
  const fabInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fabOpen) {
      setTimeout(() => fabInputRef.current?.focus(), 50);
    } else {
      setFabQuery("");
    }
  }, [fabOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFabOpen(false);
    }
    if (fabOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fabOpen]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const existingNames = new Set(ingredients.map((i) => i.name.toLowerCase()));
    const combined = [
      ...SEARCH_POOL.filter((i) => !existingNames.has(i.name.toLowerCase())),
      ...ingredients.map(({ id: _id, ...rest }) => rest),
    ];
    const seen = new Set<string>();
    return combined
      .filter((item) => {
        if (seen.has(item.name.toLowerCase())) return false;
        seen.add(item.name.toLowerCase());
        return item.name.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [search, ingredients]);

  function adjustQty(id: string, delta: number) {
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );
  }

  function addFromSearch(item: Omit<Ingredient, "id">) {
    const exists = ingredients.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
    if (exists) {
      adjustQty(exists.id, 1);
    } else {
      setIngredients((prev) => [
        ...prev,
        { ...item, id: `new-${Date.now()}`, quantity: 1 },
      ]);
    }
    setSearch("");
    searchRef.current?.blur();
  }

  // removed See All / See Less UI — users can horizontally scroll to see all items

  const ingredientsByCategory = useMemo(() => {
    const map = new Map<Category, Ingredient[]>();
    for (const cat of CATEGORIES) {
      map.set(cat, ingredients.filter((i) => i.category === cat));
    }
    return map;
  }, [ingredients]);

  return (
    <div className="space-y-6 relative min-h-screen">
      <div className="relative overflow-hidden rounded-3xl bg-[#063643] px-8 py-10 text-white">
        <div className="max-w-[55%]">
          <h1 className="text-5xl font-semibold leading-tight tracking-wider">
            Customize Your Kitchen
          </h1>
        </div>
        <div className="pointer-events-none absolute bottom-0 right-6 flex items-end gap-2 text-6xl leading-none select-none">
          <img 
          src={"/kitchen/kitchen.png"}
          className="h-50 w-80"
          />
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a7f87]" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Add ingredients"
          className="w-full rounded-2xl border border-[#d8dee2] bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#0B2B36]/40"
        />
        {suggestions.length > 0 && (
          <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-2xl border border-[#e0e5e9] bg-white shadow-lg">
            {suggestions.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addFromSearch(item); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[#f3f4f6] transition"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="font-medium text-[#0d2e38]">{item.name}</span>
                  <span className="ml-auto text-xs text-[#6a7f87]">{item.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-[#0d2e38]" />
        <button
          type="button"
          onClick={() => console.log("Feature coming soon")}
          className="flex items-center gap-2 rounded-full bg-[#063643] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0d3a49] transition"
        >
          <ScanLine className="h-4 w-4" />
          Scan Receipt
        </button>
        <div className="h-px flex-1 bg-[#0d2e38]" />
      </div>

      {CATEGORIES.map((category) => {
        const items = ingredientsByCategory.get(category) ?? [];
        const visible = items;

        return (
          <section key={category}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#0d2e38]">{category}</h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visible.map((item) => (
                <IngredientCard key={item.id} item={item} onAdjust={adjustQty} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-8 z-50 flex justify-end">
        <div className="relative">
          {fabOpen && (
            <div className="absolute bottom-20 right-0 z-50 w-[320px] rounded-2xl bg-white p-3 shadow-lg">
              <label className="mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-[#0d2e38]" />
                <span className="text-sm font-semibold text-[#0d2e38]">Search ingredients</span>
              </label>
              <input
                ref={fabInputRef}
                value={fabQuery}
                onChange={(e) => setFabQuery(e.target.value)}
                placeholder="Search existing ingredients"
                className="w-full rounded-xl border border-[#e6eef0] px-3 py-2 text-sm outline-none"
              />
              <div className="mt-2 max-h-48 overflow-auto">
                {fabQuery.trim() === "" ? (
                  <p className="text-xs text-[#6a7f87]">Type to find ingredients in your kitchen</p>
                ) : (
                  (ingredients.filter(i => i.name.toLowerCase().includes(fabQuery.trim().toLowerCase()))).length === 0 ? (
                    <p className="text-xs text-[#6a7f87]">No matches</p>
                  ) : (
                    <ul>
                      {ingredients
                        .filter(i => i.name.toLowerCase().includes(fabQuery.trim().toLowerCase()))
                        .map(i => (
                          <li key={i.id}>
                            <button
                              type="button"
                              onClick={() => { console.log('selected', i.name); setFabOpen(false); }}
                              className="w-full text-left px-2 py-2 text-sm hover:bg-[#f3f4f6] rounded"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{i.emoji}</span>
                                <div>
                                  <div className="font-medium text-[#0d2e38]">{i.name}</div>
                                  <div className="text-xs text-[#6a7f87]">{i.category}</div>
                                </div>
                              </div>
                            </button>
                          </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setFabOpen(v => !v)}
            aria-label="Search existing ingredients"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#063643] text-white shadow-lg hover:bg-[#0d3a49] transition"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
