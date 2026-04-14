"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import FallbackImage from "@/components/ui/FallbackImage";
import { Search, Plus, Minus, ScanLine, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useReceiptScan } from "@/lib/context/receipt-scan";

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
  | "Nuts & Seeds"
  | "Other";

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
  "Other",
];

const CATEGORY_EMOJI: Record<Category, string> = {
  Fruits: "🍎",
  Vegetables: "🥦",
  Spices: "🧂",
  Grains: "🌾",
  Dairy: "🥛",
  Proteins: "🍗",
  Herbs: "🌿",
  "Pantry Staples": "🫙",
  "Condiments & Sauces": "🍶",
  "Nuts & Seeds": "🥜",
  Other: "🍽️",
};

const INITIAL_INGREDIENTS: Ingredient[] = [];

const CALNINJA_API_KEY = process.env.NEXT_PUBLIC_CALNINJA_API_KEY ?? "";
const PIXABAY_API_KEY = process.env.NEXT_PUBLIC_PIXABAY_API_KEY ?? "";

/** Module-level image URL cache — persists across re-renders, cleared on page reload. */
const imageCache = new Map<string, string>();

async function fetchPixabayImage(query: string): Promise<string> {
  const key = query.toLowerCase();
  if (imageCache.has(key)) return imageCache.get(key)!;

  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", PIXABAY_API_KEY);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("category", "food");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "6");

    const res = await fetch(url.toString());
    if (!res.ok) return "";
    const data = await res.json();
    const hits = data.hits ?? [];

    if (!hits.length) {
      // Try a more specific query variants (singular/plural, "raw {name}", "{name} ingredient")
      const variants = [query, `${query} ingredient`, `raw ${query}`, `${query}s`, `${query} fresh`];
      for (const v of variants) {
        const u2 = new URL("https://pixabay.com/api/");
        u2.searchParams.set("key", PIXABAY_API_KEY);
        u2.searchParams.set("q", v);
        u2.searchParams.set("image_type", "photo");
        u2.searchParams.set("category", "food");
        u2.searchParams.set("safesearch", "true");
        u2.searchParams.set("per_page", "6");
        const r2 = await fetch(u2.toString());
        if (!r2.ok) continue;
        const d2 = await r2.json();
        if ((d2.hits ?? []).length) {
          imageCache.set(key, d2.hits[0].webformatURL as string);
          return d2.hits[0].webformatURL as string;
        }
      }
      return "";
    }

    // Prefer hits whose tags match tokens from the query (reduces generic stock images)
    const tokens = (query || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && t.length > 2);
    for (const hit of hits) {
      const tags = (hit.tags as string | undefined)?.toLowerCase() ?? "";
      for (const tk of tokens) {
        if (tags.includes(tk)) {
          imageCache.set(key, hit.webformatURL as string);
          return hit.webformatURL as string;
        }
      }
    }

    // Fallback: return first hit
    const imageUrl: string = hits[0].webformatURL ?? "";
    imageCache.set(key, imageUrl);
    return imageUrl;
  } catch {
    return "";
  }
}

// ── Local food pool for instant typeahead (no API call while typing) ──────────
const FOOD_POOL: string[] = [
  // Fruits
  "Apple", "Apricot", "Avocado", "Banana", "Blackberry", "Blueberry",
  "Cherry", "Coconut", "Date", "Fig", "Grape", "Grapefruit", "Guava",
  "Kiwi", "Lemon", "Lime", "Mango", "Melon", "Nectarine", "Orange",
  "Papaya", "Peach", "Pear", "Pineapple", "Plum", "Pomegranate",
  "Raspberry", "Strawberry", "Watermelon",
  // Vegetables
  "Artichoke", "Arugula", "Asparagus", "Beet", "Bell Pepper", "Bok Choy",
  "Broccoli", "Brussels Sprouts", "Cabbage", "Carrot", "Cauliflower",
  "Celery", "Corn", "Cucumber", "Eggplant", "Fennel", "Garlic", "Kale",
  "Leek", "Lettuce", "Mushroom", "Onion", "Parsnip", "Peas", "Potato",
  "Radish", "Shallot", "Spinach", "Squash", "Sweet Potato", "Tomato",
  "Turnip", "Yam", "Zucchini",
  // Proteins
  "Beef", "Bison", "Chicken", "Chicken Breast", "Chicken Thigh",
  "Cod", "Crab", "Duck", "Edamame", "Egg", "Ground Beef", "Ground Turkey",
  "Halibut", "Lamb", "Lobster", "Pork", "Salmon", "Sardine", "Seitan",
  "Shrimp", "Tempeh", "Tilapia", "Tofu", "Trout", "Tuna", "Turkey",
  "Veal", "Venison",
  // Dairy
  "Brie", "Butter", "Camembert", "Cheddar", "Cream", "Cream Cheese",
  "Cottage Cheese", "Ghee", "Greek Yogurt", "Kefir", "Milk",
  "Mozzarella", "Parmesan", "Ricotta", "Yogurt",
  // Grains
  "Bagel", "Barley", "Bread", "Brown Rice", "Buckwheat", "Bulgur",
  "Cereal", "Couscous", "Crackers", "Farro", "Flour", "Millet", "Oats",
  "Pasta", "Quinoa", "Rice", "Rye", "Spaghetti", "Tortilla", "White Rice",
  // Herbs
  "Basil", "Bay Leaf", "Chives", "Cilantro", "Dill", "Lemongrass",
  "Marjoram", "Mint", "Oregano", "Parsley", "Rosemary", "Sage",
  "Tarragon", "Thyme",
  // Spices
  "Allspice", "Anise", "Black Pepper", "Cardamom", "Cayenne",
  "Chili Powder", "Cinnamon", "Cloves", "Coriander", "Cumin",
  "Curry Powder", "Ginger", "Mustard Seed", "Nutmeg", "Paprika",
  "Saffron", "Turmeric", "Vanilla",
  // Nuts & Seeds
  "Almonds", "Cashews", "Chia Seeds", "Flaxseed", "Hazelnuts",
  "Hemp Seeds", "Macadamia Nuts", "Peanuts", "Pecans", "Pine Nuts",
  "Pistachios", "Pumpkin Seeds", "Sesame Seeds", "Sunflower Seeds", "Walnuts",
  // Condiments & Sauces
  "Aioli", "BBQ Sauce", "Hot Sauce", "Hummus", "Ketchup", "Marinara",
  "Mayonnaise", "Mustard", "Pesto", "Ranch Dressing", "Salsa",
  "Soy Sauce", "Tahini", "Vinegar", "Worcestershire Sauce",
  // Pantry Staples
  "Baking Powder", "Baking Soda", "Canola Oil", "Cocoa Powder",
  "Coconut Oil", "Dark Chocolate", "Honey", "Jam", "Maple Syrup",
  "Molasses", "Olive Oil", "Sugar", "Vegetable Oil",
];

// ── CalorieNinjas helpers ─────────────────────────────────────────────────────

interface NinjaItem {
  name: string;
  calories: number;
  serving_size_g: number;
  fat_total_g: number;
  protein_g: number;
  carbohydrates_total_g: number;
}

/** Categorises a food by its common name since CalorieNinjas returns no category. */
function guessCategoryFromName(name: string): Category {
  const lc = name.toLowerCase();
  if (/apple|banana|orange|grape|strawberr|blueberr|raspberr|blackberr|mango|pineapple|watermelon|melon|peach|pear|plum|cherry|kiwi|lemon|lime|grapefruit|avocado|fig|date|coconut|papaya|pomegranate|apricot|nectarine/.test(lc))
    return "Fruits";
  if (/carrot|broccoli|spinach|tomato|cucumber|lettuce|onion|garlic|potato|sweet potato|bell pepper|jalape|celery|zucchini|squash|cauliflower|cabbage|kale|asparagus|beet|corn|pea |peas|bean|lentil|mushroom|artichoke|eggplant|leek|radish|turnip|arugula|bok choy|brussels|fennel|parsnip|shallot|yam/.test(lc))
    return "Vegetables";
  if (/chicken|beef|pork|lamb|turkey|salmon|tuna|shrimp|crab|lobster|tilapia|cod|halibut|trout|sardine|duck|veal|bison|venison|egg|tofu|tempeh|seitan|edamame|fish/.test(lc))
    return "Proteins";
  if (/milk|cheese|yogurt|butter|cream|ghee|kefir|cottage|mozzarella|cheddar|parmesan|ricotta|brie|camembert/.test(lc))
    return "Dairy";
  if (/\brice\b|bread|pasta|oat|wheat|flour|cereal|quinoa|barley|rye|tortilla|bagel|muffin|cracker|noodle|spaghetti|couscous|bulgur|farro|millet/.test(lc))
    return "Grains";
  if (/basil|cilantro|parsley|\bmint\b|rosemary|thyme|oregano|sage|\bdill\b|tarragon|chive|bay leaf|lemongrass|marjoram/.test(lc))
    return "Herbs";
  if (/pepper|cumin|turmeric|paprika|cinnamon|ginger|nutmeg|clove|cardamom|coriander|allspice|cayenne|chili|curry|saffron|vanilla|anise|mustard seed/.test(lc))
    return "Spices";
  if (/almond|walnut|pecan|cashew|pistachio|peanut|hazelnut|macadamia|pine nut|chia|flaxseed|sesame|sunflower seed|pumpkin seed|hemp seed/.test(lc))
    return "Nuts & Seeds";
  if (/ketchup|mustard|mayo|mayonnaise|ranch|vinegar|soy sauce|hot sauce|bbq|worcestershire|tahini|hummus|salsa|pesto|marinara|dressing|aioli/.test(lc))
    return "Condiments & Sauces";
  if (/sugar|honey|maple syrup|olive oil|coconut oil|vegetable oil|canola oil|baking|chocolate|cocoa|jam|jelly|syrup|molasses|starch|extract/.test(lc))
    return "Pantry Staples";
  return "Other";
}

/** Returns the most sensible default unit for a given category. */
function defaultUnitForCategory(cat: Category): Unit {
  switch (cat) {
    case "Fruits":
      return "lbs"; // fruits are commonly weighed in pounds
    case "Vegetables":
      return "lbs"; // vegetables are commonly weighed in pounds
    case "Proteins":
      return "oz"; // meats and proteins measured in ounces by default
    case "Dairy":
      return "cups";
    case "Grains":
      return "cups";
    case "Spices":
      return "oz"; // display ounces for spices
    case "Herbs":
      return "tbsp";
    case "Condiments & Sauces":
      return "tbsp";
    case "Nuts & Seeds":
      return "oz"; // nuts more naturally in ounces
    case "Pantry Staples":
      return "cups";
    default:
      return "units"; // fallback for Other
  }
}

/** Grams in a realistic single serving for each category (CalorieNinjas returns per-100g values). */
function servingGramsForCategory(cat: Category): number {
  switch (cat) {
    case "Fruits":              return 453.6;  // 1 lb
    case "Vegetables":          return 453.6;  // 1 lb
    case "Proteins":            return 113.4;  // 4 oz
    case "Dairy":               return 244;    // 1 cup (liquid avg)
    case "Grains":              return 185;    // 1 cup (cooked avg)
    case "Spices":              return 28.35;  // 1 oz
    case "Herbs":               return 3;      // 1 tbsp
    case "Condiments & Sauces": return 15;     // 1 tbsp
    case "Nuts & Seeds":        return 28.35;  // 1 oz
    case "Pantry Staples":      return 240;    // 1 cup
    default:                    return 100;    // Other — keep 100g as-is
  }
}

/** Human-readable single-serving label matching servingGramsForCategory. */
function servingLabelForCategory(cat: Category): string {
  switch (cat) {
    case "Fruits":              return "1 lb";
    case "Vegetables":          return "1 lb";
    case "Proteins":            return "4 oz";
    case "Dairy":               return "1 cup";
    case "Grains":              return "1 cup";
    case "Spices":              return "1 oz";
    case "Herbs":               return "1 tbsp";
    case "Condiments & Sauces": return "1 tbsp";
    case "Nuts & Seeds":        return "1 oz";
    case "Pantry Staples":      return "1 cup";
    default:                    return "1 unit";
  }
}

/** Converts a CalorieNinjas item into an app Ingredient (minus id). */
function mapCalNinjaItem(item: NinjaItem): Omit<Ingredient, "id"> {
  const name = item.name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const category = guessCategoryFromName(item.name);
  const scale = servingGramsForCategory(category) / 100;
  return {
    name,
    category,
    quantity: 1,
    unit: defaultUnitForCategory(category),
    imageUrl: "",
    emoji: CATEGORY_EMOJI[category],
    macros: {
      calories: Math.round(item.calories * scale),
      protein: parseFloat((item.protein_g * scale).toFixed(1)),
      carbs: parseFloat((item.carbohydrates_total_g * scale).toFixed(1)),
      fat: parseFloat((item.fat_total_g * scale).toFixed(1)),
    },
    substitution: "—",
  };
}

function IngredientCard({
  item,
  onAdjust,
  onDelete,
}: {
  item: Ingredient;
  onAdjust: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
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
              <FallbackImage src={item.imageUrl} alt={item.name} fallbackCategory={item.category} className="h-full w-full rounded-full object-cover" />
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
          <div className="flex items-center justify-between pb-1">
            <p className="text-xs font-bold leading-tight truncate">{item.name}</p>
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="ml-2 shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-white/40 hover:text-red-400 transition"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <p className="text-[9px] text-white/40 border-b border-white/10 pb-2">
            Serving: {servingLabelForCategory(item.category)}
          </p>
          <div className="mt-2 flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">Calories</span>
              <span className="text-[10px] font-semibold">{item.macros.calories} kcal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">Protein</span>
              <span className="text-[10px] font-semibold">{item.macros.protein}g</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">Carbs</span>
              <span className="text-[10px] font-semibold">{item.macros.carbs}g</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">Fat</span>
              <span className="text-[10px] font-semibold">{item.macros.fat}g</span>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[8px] text-white/30 leading-tight">
            All values per {servingLabelForCategory(item.category)} · tap to flip
          </p>
        </div>
      </div>
    </div>
  );
}

export default function KitchenPantry() {
  const { openReceiptScan } = useReceiptScan();
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [search, setSearch] = useState("");
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isLoadingPantry, setIsLoadingPantry] = useState(false);
  const [saveToast, setSaveToast] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipNextSave = useRef(true);
  const pantryLoaded = useRef(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  // Always points to the latest ingredients — avoids stale-closure bugs in async save paths
  const ingredientsRef = useRef<Ingredient[]>(INITIAL_INGREDIENTS);

  // Quantity modal state
  const [pendingIngredient, setPendingIngredient] = useState<(Omit<Ingredient, "id"> & { resolvedImageUrl: string }) | null>(null);
  const [pendingQty, setPendingQty] = useState("1");
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // FAB state (search existing pantry items)
  const [fabOpen, setFabOpen] = useState(false);
  const [fabQuery, setFabQuery] = useState("");
  const fabInputRef = useRef<HTMLInputElement>(null);

  // Instant local suggestions — filters FOOD_POOL with no API call while typing
  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const existingNames = new Set(ingredients.map((i) => i.name.toLowerCase()));
    return FOOD_POOL
      .filter((name) => name.toLowerCase().includes(q) && !existingNames.has(name.toLowerCase()))
      .slice(0, 8);
  }, [search, ingredients]);

  // Keep ingredientsRef in sync on every render
  ingredientsRef.current = ingredients;

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

  function adjustQty(id: string, delta: number) {
    const item = ingredientsRef.current.find((i) => i.id === id);
    if (item && item.quantity + delta <= 0) {
      // Quantity hits zero — remove from DB immediately
      deleteIngredientFromDB(item.name);
    }
    setIngredients((prev) =>
      prev
        .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0)
    );
  }

  function deleteIngredient(id: string) {
    const item = ingredientsRef.current.find((i) => i.id === id);
    if (item) deleteIngredientFromDB(item.name);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  async function deleteIngredientFromDB(name: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    try {
      const userRes = await supabase.auth.getUser();
      const user = (userRes as any)?.data?.user;
      if (!user) return;
      await supabase
        .from("user_ingredients")
        .delete()
        .eq("user_id", user.id)
        .eq("name", name);
    } catch (err) {
      console.error("Failed to delete ingredient from DB:", err);
    }
  }

  async function saveToSupabase() {
    // Prevent concurrent saves — if one is already in flight, note that another
    // is pending and let the in-flight save re-run when it finishes.
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    isSavingRef.current = true;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) { isSavingRef.current = false; return; }
    setSaveToast("saving");
    try {
      const userRes = await supabase.auth.getUser();
      const user = (userRes as any)?.data?.user;
      if (!user) {
        setSaveToast("idle");
        return;
      }

      // Use ref so the pending-retry path always saves the freshest state
      const snapshot = ingredientsRef.current;

      if (snapshot.length === 0) {
        // Pantry is empty — wipe all rows for this user
        const { error } = await supabase
          .from("user_ingredients")
          .delete()
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const payload = snapshot.map((ing) => ({
          user_id: user.id,
          name: ing.name,
          image_url: ing.imageUrl || null,
          quantity: ing.quantity,
          quantity_unit: servingLabelForCategory(ing.category),
          calories: ing.macros.calories,
          protein_g: ing.macros.protein,
          fat_g: ing.macros.fat,
          carbs_g: ing.macros.carbs,
        }));

        // Upsert: inserts new rows, updates existing ones — no duplicates ever
        const { error: upsertError } = await supabase
          .from("user_ingredients")
          .upsert(payload, { onConflict: "user_id,name" });
        if (upsertError) throw upsertError;
      }

      setSaveToast("saved");
      setTimeout(() => setSaveToast("idle"), 2500);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Failed to sync pantry:", err.message, err.stack);
      } else {
        console.error("Failed to sync pantry:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
      setSaveToast("error");
      setTimeout(() => setSaveToast("idle"), 4000);
    } finally {
      isSavingRef.current = false;
      // If a save was requested while we were running, do it now
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        saveToSupabase();
      }
    }
  }

  // Load pantry from Supabase when component mounts
  async function loadFromSupabase() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.error("Supabase client not initialized");
      return;
    }
    setIsLoadingPantry(true);
    try {
      const userRes = await supabase.auth.getUser();
      const user = (userRes as any)?.data?.user;
      if (!user) {
        console.info("No signed-in user — skipping pantry load");
        return;
      }

      const { data, error } = await supabase
        .from("user_ingredients")
        .select("id, name, image_url, quantity, quantity_unit, calories, protein_g, fat_g, carbs_g")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      const rows = (data as any[]) ?? [];
      const mapped: Ingredient[] = rows.map((row, idx) => {
        const name = (row.name ?? "").toString();
        const category = guessCategoryFromName(name);
        return {
          id: row.id ? String(row.id) : `db-${idx}-${Date.now()}`,
          name,
          category,
          quantity: Number(row.quantity) > 0 ? Number(row.quantity) : 1,
          unit: defaultUnitForCategory(category),
          imageUrl: row.image_url ?? "",
          emoji: CATEGORY_EMOJI[category],
          macros: {
            calories: Number(row.calories) || 0,
            protein: Number(row.protein_g) || 0,
            carbs: Number(row.carbs_g) || 0,
            fat: Number(row.fat_g) || 0,
          },
          substitution: "—",
        } as Ingredient;
      });

      skipNextSave.current = true;
      setIngredients(mapped);
      pantryLoaded.current = true;
    } catch (err) {
      console.error("Failed to load pantry:", err);
    } finally {
      setIsLoadingPantry(false);
    }
  }

  useEffect(() => {
    loadFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save pantry whenever ingredients change (1.5 s debounce)
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!pantryLoaded.current) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveToSupabase();
    }, 1500);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients]);

  async function selectFood(name: string) {
    const exists = ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      adjustQty(exists.id, 1);
      setSearch("");
      return;
    }

    setLoadingName(name);
    try {
      const [nutritionRes, imageUrl] = await Promise.all([
        fetch(
          `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(name)}`,
          { headers: { "X-Api-Key": CALNINJA_API_KEY } }
        ),
        fetchPixabayImage(name),
      ]);

      const data: { items: NinjaItem[] } = nutritionRes.ok
        ? await nutritionRes.json()
        : { items: [] };
      const ninjaItem = data.items?.[0];
      const category = guessCategoryFromName(name);
      const displayName = name.replace(/\b\w/g, (c) => c.toUpperCase());

      const base: Omit<Ingredient, "id"> = ninjaItem
        ? { ...mapCalNinjaItem(ninjaItem), name: displayName, imageUrl }
        : {
            name: displayName,
            category,
            quantity: 1,
            unit: defaultUnitForCategory(category),
            imageUrl,
            emoji: CATEGORY_EMOJI[category],
            macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            substitution: "—",
          };

      // Show modal so user can set quantity before committing
      setPendingIngredient({ ...base, resolvedImageUrl: imageUrl });
      setPendingQty("1");
      setSearch("");
      searchRef.current?.blur();
      setTimeout(() => qtyInputRef.current?.focus(), 80);
    } catch {
      // silent
    } finally {
      setLoadingName(null);
    }
  }

  function confirmPendingIngredient() {
    if (!pendingIngredient) return;
    const qty = Math.max(1, parseInt(pendingQty, 10) || 1);
    setIngredients((prev) => [
      ...prev,
      {
        ...pendingIngredient,
        quantity: qty,
        imageUrl: pendingIngredient.resolvedImageUrl,
        id: `new-${Date.now()}`,
      },
    ]);
    setPendingIngredient(null);
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
          <FallbackImage src={"/kitchen/kitchen.png"} alt="kitchen" className="h-50 w-80" />
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
        {filteredSuggestions.length > 0 && (
          <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-2xl border border-[#e0e5e9] bg-white shadow-lg">
            {filteredSuggestions.map((name) => {
              const cat = guessCategoryFromName(name);
              const isLoading = loadingName === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    disabled={loadingName !== null}
                    onMouseDown={(e) => { e.preventDefault(); selectFood(name); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[#f3f4f6] transition disabled:opacity-60"
                  >
                    {isLoading ? (
                      <svg className="h-5 w-5 animate-spin shrink-0 text-[#6a7f87]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <span className="text-xl shrink-0">{CATEGORY_EMOJI[cat]}</span>
                    )}
                    <span className="font-medium text-[#0d2e38]">{name}</span>
                    <span className="ml-auto text-xs text-[#6a7f87] shrink-0">{cat}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-[#0d2e38]" />
        <button
          type="button"
          onClick={() => openReceiptScan()}
          className="flex items-center gap-2 rounded-full bg-[#063643] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0d3a49] transition"
        >
          <ScanLine className="h-4 w-4" />
          Scan Receipt
        </button>
        <div className="h-px flex-1 bg-[#0d2e38]" />
      </div>

      <div className="relative min-h-[120px]">
        <div className="space-y-6 pb-20">
          {isLoadingPantry ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#063643]" />
              <span className="ml-3 text-[#6a7f87] text-sm">Loading your pantry…</span>
            </div>
          ) : CATEGORIES.map((category) => {
            const items = ingredientsByCategory.get(category) ?? [];
            if (items.length === 0) return null;

            return (
              <section key={category}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#0d2e38]">{category}</h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {items.map((item) => (
                    <IngredientCard key={item.id} item={item} onAdjust={adjustQty} onDelete={deleteIngredient} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-4 z-10">
          <div className="flex justify-end pr-6">
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
                      ingredients.filter(i => i.name.toLowerCase().includes(fabQuery.trim().toLowerCase())).length === 0 ? (
                        <p className="text-xs text-[#6a7f87]">No matches</p>
                      ) : (
                        <ul>
                          {ingredients
                            .filter(i => i.name.toLowerCase().includes(fabQuery.trim().toLowerCase()))
                            .map(i => (
                              <li key={i.id}>
                                <button
                                  type="button"
                                  onClick={() => setFabOpen(false)}
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
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#063643] text-white shadow-lg hover:bg-[#0d3a49] transition"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-save toast */}
      {saveToast !== "idle" && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg ${
            saveToast === "saved"
              ? "bg-green-600"
              : saveToast === "error"
              ? "bg-red-600"
              : "bg-[#063643]"
          }`}
        >
          {saveToast === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveToast === "saved" && <CheckCircle2 className="h-4 w-4" />}
          {saveToast === "error" && <AlertCircle className="h-4 w-4" />}
          {saveToast === "saving"
            ? "Saving pantry\u2026"
            : saveToast === "saved"
            ? "Pantry saved!"
            : "Save failed"}
        </div>
      )}

      {/* Quantity modal */}
      {pendingIngredient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPendingIngredient(null)}
        >
          <div
            className="w-[320px] rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#063643] overflow-hidden">
                {pendingIngredient.resolvedImageUrl ? (
                  <FallbackImage
                    src={pendingIngredient.resolvedImageUrl}
                    alt={pendingIngredient.name}
                    fallbackCategory={pendingIngredient.category}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">{pendingIngredient.emoji}</span>
                )}
              </div>
              <div>
                <p className="text-base font-bold text-[#0d2e38]">{pendingIngredient.name}</p>
                <p className="text-xs text-[#6a7f87]">{pendingIngredient.category} &middot; per {servingLabelForCategory(pendingIngredient.category)}</p>
              </div>
            </div>

            {/* Quantity input */}
            <label className="block mb-1 text-xs font-semibold text-[#0d2e38] uppercase tracking-wide">
              Quantity ({pendingIngredient.unit})
            </label>
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setPendingQty((v) => String(Math.max(1, (parseInt(v, 10) || 1) - 1)))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d8dee2] text-[#0d2e38] hover:bg-[#f3f4f6] transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                value={pendingQty}
                onChange={(e) => setPendingQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmPendingIngredient()}
                className="flex-1 rounded-xl border border-[#d8dee2] py-2 text-center text-lg font-semibold text-[#0d2e38] outline-none focus:border-[#063643]"
              />
              <button
                type="button"
                onClick={() => setPendingQty((v) => String((parseInt(v, 10) || 1) + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d8dee2] text-[#0d2e38] hover:bg-[#f3f4f6] transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingIngredient(null)}
                className="flex-1 rounded-2xl border border-[#d8dee2] py-2.5 text-sm font-semibold text-[#6a7f87] hover:bg-[#f3f4f6] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingIngredient}
                className="flex-1 rounded-2xl bg-[#063643] py-2.5 text-sm font-semibold text-white hover:bg-[#0d3a49] transition"
              >
                Add to Pantry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
