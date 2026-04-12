import { NextRequest, NextResponse } from "next/server";
import type {
  MealType,
  GeneratedRecipes,
  InventoryItem,
  UserPreferences,
} from "@/lib/recipes/types";

// ── Models ────────────────────────────────────────────────────────────────────
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Mock User Preferences ─────────────────────────────────────────────────────
// TODO: Replace with a Supabase fetch when the `user_preferences` table exists.
//       See lib/recipes/types.ts for the full swap instructions.
const MOCK_USER_PREFERENCES: UserPreferences = {
  diet: "balanced",
  allergies: [],
  favoriteCuisines: ["Mediterranean", "Asian", "Mexican"],
  calorieGoal: 2000,
};
// ──────────────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  inventory: InventoryItem[];
  activeTrend: string;
}

interface RawRecipe {
  name: string;
  description: string;
  calories: number;
  imageQuery: string;
  ingredients: string[];
  instructions: string;
  prepTime: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
}

type RawGenerated = Record<MealType, RawRecipe[]>;

// Fallback images per meal type (used when Pixabay fails or key is absent)
const FALLBACK_IMAGES: Record<MealType, string> = {
  breakfast:
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=480&h=480&fit=crop&auto=format",
  lunch:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&h=480&fit=crop&auto=format",
  dinner:
    "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=480&h=480&fit=crop&auto=format",
  snacks:
    "https://images.unsplash.com/photo-1559181567-c3190bfbce97?w=480&h=480&fit=crop&auto=format",
};

// ── Pixabay image helper ──────────────────────────────────────────────────────
async function fetchPixabayImage(
  query: string,
  apiKey: string,
  fallback: string
): Promise<string> {
  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("category", "food");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "6");

    const res = await fetch(url.toString());
    if (!res.ok) return fallback;
    const data = await res.json();
    const hits = data.hits ?? [];
    if (!hits.length) return fallback;

    // Try to pick an image whose tags match tokens from the query (reduce generic stock images)
    const tokens = (query || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t: string) => t && t.length > 2);

    for (const hit of hits) {
      const tags = (hit.tags as string | undefined)?.toLowerCase() ?? "";
      for (const tk of tokens) {
        if (tags.includes(tk)) return hit.webformatURL as string;
      }
    }

    // Fallback: return first hit
    return (hits[0].webformatURL as string) ?? fallback;
  } catch {
    return fallback;
  }
}

function sanitizeDishName(name: string): string {
  if (!name || typeof name !== "string") return String(name ?? "");
  // Remove parenthetical notes and trailing substitution phrases
  let s = name.split("(")[0];
  s = s.split("—")[0];
  s = s.split("-")[0];
  s = s.replace(/\bsub(stitute)?s?\b.*$/i, "").trim();
  // Remove any stray punctuation around the name
  return s.replace(/^["'\s]+|["'\s]+$/g, "").trim();
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(
  inventory: InventoryItem[],
  preferences: UserPreferences,
  activeTrend: string
): string {
  const inventoryList =
    inventory.length > 0
      ? inventory.map((i) => `${i.name} (${i.quantity} ${i.quantity_unit})`).join(", ")
      : "No inventory provided — use common pantry staples";

  return `You are a professional nutritionist and chef for Noura, a health-focused food app.

TASK: Generate exactly 5 recipes for EACH of these 4 meal types: breakfast, lunch, dinner, snacks (20 recipes total). You MUST produce exactly 5 snack recipes — not 1, not 3, exactly 5.

RULES:
1. Use primarily the provided kitchen inventory.
2. If a needed ingredient is absent, suggest a healthy substitute in parentheses within the description. Example: "...topped with Greek yogurt (sub for sour cream)..."
3. Relate each recipe to the trending focus tag below.
4. Strictly honour the dietary preferences.
5. Keep descriptions to 2-3 sentences — describe the dish, its flavour profile, and why it fits the user's goals.
6. The 'name' field MUST be a single concise dish name ONLY. Do NOT include substitutions, parenthetical notes, ingredient lists, or any explanatory text in the 'name' — put substitutions or alternatives in the 'description' field only. Example valid name: "Shakshuka". Invalid: "Shakshuka (use yogurt if no feta)".
7. Calories must be a single integer representing one serving.

KITCHEN INVENTORY:
${inventoryList}

USER PREFERENCES:
- Diet: ${preferences.diet}
- Allergies / Restrictions: ${preferences.allergies.length ? preferences.allergies.join(", ") : "none"}
- Favourite cuisines: ${preferences.favoriteCuisines.join(", ")}
- Daily calorie goal: ${preferences.calorieGoal} kcal

TRENDING FOCUS: ${activeTrend}

Return ONLY a valid JSON object — no markdown, no explanation — in exactly this format:
{
  "breakfast": [
    { "name": "Recipe Name", "description": "2-3 sentence description of the dish, its flavour, and health benefits.", "calories": 420, "prepTime": 20, "imageQuery": "food query", "ingredients": ["2 large eggs", "1 cup spinach", "1 tbsp olive oil", "1/2 tsp salt", "1/4 tsp black pepper"], "instructions": "Step 1: Heat olive oil in a pan over medium heat until shimmering.\nStep 2: Add spinach and sauté, stirring frequently, for 2 minutes until wilted.\nStep 3: Create a small well in the centre, crack in the eggs, and season with salt and pepper.\nStep 4: Cover the pan and cook for 3-4 minutes until the whites are fully set but yolks remain runny. Serve immediately with crusty bread.", "protein_g": 18, "fat_g": 28, "carbs_g": 3 }
  ],
  "lunch": [ ...5 items ],
  "dinner": [ ...5 items ],
  "snacks": [ ...exactly 5 items, same shape as above ]
}

RULES FOR FIELDS:
- 'description': 1-2 sentences covering what the dish and its flavour profile (optional: you can add its nutritional benefit if needed).
- 'ingredients': Each entry MUST include measurement + ingredient, e.g. "200g chicken breast", "1 cup basmati rice", "2 tbsp soy sauce". Never list an ingredient without a quantity.
- 'prepTime': Integer, total minutes from start to plate (includes both prep and cook time).
- 'calories': Integer, total kcal for one serving.
- 'instructions': Detailed, numbered step-by-step method. Each step MUST be on its own line, prefixed with its number (e.g. "Step 1: ...\nStep 2: ...\nStep 3: ..."). Each step should be a full sentence explaining exactly what to do, including temperatures, timings, and technique. Minimum 4 steps for all meal types including snacks. Never put all steps on one line.
- 'protein_g', 'fat_g', 'carbs_g': Integers representing grams of each macronutrient per single serving. Provide reasonable estimates that sum approximately to the calories reported (not required to be perfectly exact, but avoid clearly impossible values).`;
}

// ── Groq API caller ───────────────────────────────────────────────────────────
async function callGroq(prompt: string, model: string): Promise<Response> {
  const apiKey = process.env.NEXT_PUBLIC_GROK_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_GROK_API_KEY is not configured");

  return fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful culinary assistant. Always respond with valid JSON only, no markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    }),
  });
}

// ── Response parser + image enrichment ───────────────────────────────────────
async function parseAndEnrichRecipes(
  rawJson: string,
  pixabayKey: string | undefined
): Promise<GeneratedRecipes> {
  const parsed: RawGenerated = JSON.parse(rawJson);
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

  // Build one image-fetch promise per recipe (all 20 in parallel)
  const imageFetches: Promise<string>[] = [];
  const recipeOrder: { meal: MealType; idx: number }[] = [];

  for (const meal of mealTypes) {
    const list = (parsed[meal] ?? []).slice(0, 5);
    list.forEach((r, idx) => {
      // Ensure the recipe `name` is strictly a dish name (no substitutions in the name)
      r.name = sanitizeDishName(String(r.name ?? ""));

      recipeOrder.push({ meal, idx });
      imageFetches.push(
        pixabayKey
          ? fetchPixabayImage(String(r.name || r.imageQuery || ""), pixabayKey, FALLBACK_IMAGES[meal])
          : Promise.resolve(FALLBACK_IMAGES[meal])
      );
    });
  }

  const imageResults = await Promise.allSettled(imageFetches);

  const result = {} as GeneratedRecipes;
  for (const meal of mealTypes) result[meal] = [];

  let globalIdx = 0;
  for (const meal of mealTypes) {
    const list = (parsed[meal] ?? []).slice(0, 5);
    result[meal] = list.map((r, i) => {
      const settled = imageResults[globalIdx++];
      return {
        id: i + 1,
        name: r.name,
        description: r.description,
        calories: Number(r.calories) || 0,
        image: settled.status === "fulfilled" ? settled.value : FALLBACK_IMAGES[meal],
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: r.instructions ?? "",
        prepTime: Number(r.prepTime) || undefined,
        protein_g: r.protein_g != null ? Number(r.protein_g) : undefined,
        fat_g: r.fat_g != null ? Number(r.fat_g) : undefined,
        carbs_g: r.carbs_g != null ? Number(r.carbs_g) : undefined,
      };
    });
  }

  return result;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { inventory, activeTrend } = body;

    if (!activeTrend) {
      return NextResponse.json(
        { error: "Missing required field: activeTrend" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(inventory ?? [], MOCK_USER_PREFERENCES, activeTrend);

    // Try primary model; auto-fallback to smaller model on rate-limit (429)
    let res = await callGroq(prompt, PRIMARY_MODEL);
    if (res.status === 429) {
      console.warn("[generate] Rate-limited on primary model — falling back to", FALLBACK_MODEL);
      res = await callGroq(prompt, FALLBACK_MODEL);
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[generate] Groq API error", res.status, errBody);
      return NextResponse.json(
        { error: `AI service error (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "{}";

    const pixabayKey = process.env.NEXT_PUBLIC_PIXABAY_API_KEY;
    const recipes = await parseAndEnrichRecipes(content, pixabayKey);

    return NextResponse.json({ recipes });
  } catch (err) {
    console.error("[generate] unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
