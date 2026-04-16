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

// ─────────────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  inventory: InventoryItem[];
  activeTrend: string;
  preferences: UserPreferences | null;
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

// Fallback images per meal type
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

// ── Unsplash image helper ─────────────────────────────────────────────────────
async function fetchUnsplashImage(
  query: string,
  accessKey: string,
  fallback: string
): Promise<string> {
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", `${query} food`);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("orientation", "squarish");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const results = data.results ?? [];
    if (!results.length) return fallback;

    // Prefer results whose alt/description contains query tokens
    const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t: string) => t.length > 2);
    for (const r of results) {
      const desc = ((r.alt_description ?? "") + " " + (r.description ?? "")).toLowerCase();
      if (tokens.some((t: string) => desc.includes(t))) {
        return (r.urls?.regular ?? r.urls?.small ?? fallback) as string;
      }
    }
    return (results[0].urls?.regular ?? results[0].urls?.small ?? fallback) as string;
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
const SPICE_LABELS = ["Mild (no heat at all)", "Gentle (a hint of warmth)", "Medium (moderate heat)", "Hot (clearly spicy)", "Extra Hot (very intense heat)"];

function buildPrompt(
  inventory: InventoryItem[],
  preferences: UserPreferences | null,
  activeTrend: string,
  mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"]
): string {
  const inventoryList =
    inventory.length > 0
      ? inventory.map((i) => `${i.name} (${i.quantity} ${i.quantity_unit})`).join(", ")
      : "No inventory provided — use common pantry staples";

  // ── HARD rules (only allergies + diets) ──────────────────────────────────
  const forbidden = preferences?.allergies ?? [];
  const activeDiets = preferences?.diets ?? [];

  const forbiddenLine = forbidden.length
    ? `NEVER use these allergens (under any name or alias): ${forbidden.join(", ")}`
    : "No allergen restrictions.";

  const dietLine = activeDiets.length
    ? `All recipes MUST comply with: ${activeDiets.join(", ")}`
    : "No diet restrictions.";

  // ── SOFT preferences (best-effort, NEVER reduce count) ────────────────────
  const softLines: string[] = [];
  const noGoItems = preferences?.noGoItems ?? [];
  if (noGoItems.length) softLines.push(`Avoid if possible (personal dislikes, not allergies): ${noGoItems.join(", ")}`);
  const cuisines = preferences?.cuisines ?? [];
  if (cuisines.length) softLines.push(`Preferred cuisines: ${cuisines.join(", ")}`);
  softLines.push(`Preferred spice level: ${SPICE_LABELS[preferences?.spiceLevel ?? 2]}`);
  const equipment = preferences?.equipment ?? [];
  if (equipment.length) softLines.push(`Available equipment: ${equipment.join(", ")}`);
  softLines.push(`Skill level: ${preferences?.skillLevel ?? "intermediate"}`);
  softLines.push(preferences?.fusionMode ? "Style: Modern Fusion encouraged" : "Style: Authentic Traditional preferred");

  const mealTypesList = mealTypes.join(", ");
  const jsonKeys = mealTypes.map((m) => `  "${m}": [ ...exactly 10 items ]`).join(",\n");

  return `You are a professional nutritionist and chef for Noura, a health-focused meal planning app.

TASK: Generate exactly 10 recipes for EACH of these meal types: ${mealTypesList}.
You MUST always produce exactly 10 unique recipes per meal type. NEVER produce fewer than 10.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD REQUIREMENTS (never violate, no exceptions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ${forbiddenLine}
2. ${dietLine}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOFT PREFERENCES (follow where practical — do NOT reduce count to satisfy these):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${softLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

GENERAL RULES:
- Use primarily the kitchen inventory; if an ingredient is missing, suggest a substitute in parentheses in description only.
- Relate each recipe to the trending focus.
- The 'name' field: a single concise dish name only — no notes or parentheses.
- Descriptions: 1-2 sentences covering the dish and its flavour.
- Calories: single integer per serving.

KITCHEN INVENTORY:
${inventoryList}

TRENDING FOCUS: ${activeTrend}

Return ONLY a valid JSON object — no markdown, no explanation:
{
${jsonKeys}
}

Each item shape:
{ "name": "Recipe Name", "description": "Short description.", "calories": 420, "prepTime": 20, "imageQuery": "food photo query", "ingredients": ["2 large eggs", "1 cup spinach"], "instructions": "Step 1: ...\\nStep 2: ...\\nStep 3: ...\\nStep 4: ...", "protein_g": 18, "fat_g": 12, "carbs_g": 30 }

FIELD RULES:
- 'ingredients': measurement + ingredient every entry.
- 'prepTime': total minutes start to plate (integer).
- 'instructions': minimum 4 numbered steps on separate lines.
- 'protein_g', 'fat_g', 'carbs_g': integer grams per serving.`;
}

// ── Groq API caller ───────────────────────────────────────────────────────────
// Per-call max_tokens budget.
// Each call requests 10 recipes for ONE meal type.
// ~200 tokens/recipe × 10 = ~2000 output tokens needed.
// llama-3.3-70b-versatile TPM: ~unlimited; llama-3.1-8b-instant TPM: 6000.
// Keep total (prompt ~600 + max_tokens) under 6000 for the fallback.
const MAX_TOKENS: Record<string, number> = {
  [PRIMARY_MODEL]: 5000,
  [FALLBACK_MODEL]: 4000,
};

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
      max_tokens: MAX_TOKENS[model] ?? 7500,
      response_format: { type: "json_object" },
    }),
  });
}

// ── Response parser + image enrichment ───────────────────────────────────────
async function parseAndEnrichRecipes(
  rawJson: string,
  unsplashKey: string | undefined
): Promise<GeneratedRecipes> {
  const parsed: RawGenerated = JSON.parse(rawJson);
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

  // Build one image-fetch promise per recipe (all 20 in parallel)
  const imageFetches: Promise<string>[] = [];
  const recipeOrder: { meal: MealType; idx: number }[] = [];

  for (const meal of mealTypes) {
    const list = (parsed[meal] ?? []).slice(0, 10);
    list.forEach((r, idx) => {
      // Ensure the recipe `name` is strictly a dish name (no substitutions in the name)
      r.name = sanitizeDishName(String(r.name ?? ""));

      recipeOrder.push({ meal, idx });
      imageFetches.push(
        unsplashKey
          ? fetchUnsplashImage(String(r.name || r.imageQuery || ""), unsplashKey, FALLBACK_IMAGES[meal])
          : Promise.resolve(FALLBACK_IMAGES[meal])
      );
    });
  }

  const imageResults = await Promise.allSettled(imageFetches);

  const result = {} as GeneratedRecipes;
  for (const meal of mealTypes) result[meal] = [];

  let globalIdx = 0;
  for (const meal of mealTypes) {
    const list = (parsed[meal] ?? []).slice(0, 10);
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
    const { inventory, activeTrend, preferences } = body;

    if (!activeTrend) {
      return NextResponse.json(
        { error: "Missing required field: activeTrend" },
        { status: 400 }
      );
    }

    // ── Four parallel calls — one per meal type ──────────────────────────
    // Splitting keeps each request small enough for both primary and fallback
    // models (total tokens well under the 6 000 TPM limit on llama-3.1-8b).
    const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

    async function runCall(prompt: string, label: string): Promise<string> {
      let res = await callGroq(prompt, PRIMARY_MODEL);
      if (res.status === 429 || res.status === 413) {
        console.warn(`[generate:${label}] ${res.status} on primary — falling back to`, FALLBACK_MODEL);
        res = await callGroq(prompt, FALLBACK_MODEL);
      }
      if (!res.ok) {
        const errBody = await res.text();
          console.error(`[generate:${label}] Groq error`, res.status, errBody);
          let friendlyMsg: string;
          try {
            const parsed = JSON.parse(errBody) as { error?: { message?: string; code?: string } };
            const rawMsg = parsed?.error?.message ?? errBody;

            // If this is a rate-limit error from Groq, extract the suggested wait time
            // and present a concise, user-friendly message that includes how long to wait.
            if (parsed?.error?.code === "rate_limit_exceeded" || /rate limit/i.test(rawMsg)) {
              const m = rawMsg.match(/Please try again in ([0-9.]+)s/i);
              const seconds = m ? Math.ceil(Number(m[1])) : null;
              if (seconds && Number.isFinite(seconds)) {
                friendlyMsg = `The AI service is temporarily busy. Please wait about ${seconds} second${seconds === 1 ? "" : "s"} and try again.`;
              } else {
                friendlyMsg = `The AI service is temporarily busy due to rate limits. Please try again shortly.`;
              }
            } else {
              friendlyMsg = rawMsg;
            }
          } catch {
            friendlyMsg = errBody;
          }
          throw new Error(`AI service error (${res.status}): ${friendlyMsg}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "{}";
    }

    const inv = inventory ?? [];
    const prefs = preferences ?? null;
    const contents = await Promise.all(
      mealTypes.map((m) =>
        runCall(buildPrompt(inv, prefs, activeTrend, [m]), m)
      )
    );

    const unsplashKey = (process.env.UNSPLASH_ACCESS_KEY ?? process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY)?.trim();
    const enriched = await Promise.all(
      contents.map((c) => parseAndEnrichRecipes(c, unsplashKey))
    );

    const recipes: GeneratedRecipes = {
      breakfast: enriched[0].breakfast,
      lunch:     enriched[1].lunch,
      dinner:    enriched[2].dinner,
      snacks:    enriched[3].snacks,
    };

    return NextResponse.json({ recipes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[generate] unexpected error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
