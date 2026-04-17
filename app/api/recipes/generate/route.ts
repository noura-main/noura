import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import type {
  MealType,
  GeneratedRecipes,
  InventoryItem,
  UserPreferences,
} from "@/lib/recipes/types";

// ── Models / API ──────────────────────────────────────────────────────────────
const PRIMARY_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

// ─────────────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  inventory: InventoryItem[];
  activeTrend: string;
  preferences: UserPreferences | null;
  specialInstructions?: string | null;
  mealTypes?: MealType[];
  count?: number;
  background?: boolean;
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
  let s = name.split("(")[0];
  s = s.split("—")[0];
  s = s.split("-")[0];
  s = s.replace(/\bsub(stitute)?s?\b.*$/i, "").trim();
  return s.replace(/^["'\s]+|["'\s]+$/g, "").trim();
}

  function stringifyIngredient(item: any): string {
    if (item == null) return "";
    if (typeof item === "string") return item.trim();
    if (typeof item === "number" || typeof item === "bigint") return String(item);
    if (Array.isArray(item)) {
      return item.map((it) => stringifyIngredient(it)).filter(Boolean).join(" ").trim();
    }
    if (typeof item === "object") {
      const nameKeys = ["name", "ingredient", "item", "label", "title", "text"];
      const qtyKeys = ["quantity", "qty", "amount", "count", "number", "num"];
      const unitKeys = ["unit", "quantity_unit", "u", "measure", "measurement", "measure_unit"];

      const name = nameKeys.map((k) => (k in item ? item[k] : undefined)).find((v) => v != null);
      const qty = qtyKeys.map((k) => (k in item ? item[k] : undefined)).find((v) => v != null);
      const unit = unitKeys.map((k) => (k in item ? item[k] : undefined)).find((v) => v != null);

      const parts: string[] = [];
      if (qty != null && String(qty).trim() !== "") parts.push(String(qty).trim());
      if (unit != null && String(unit).trim() !== "") parts.push(String(unit).trim());
      if (name != null) {
        if (typeof name === "string") parts.push(name.trim());
        else parts.push(stringifyIngredient(name));
      } else {
        const fallback = Object.values(item).find((v) => typeof v === "string" && v.trim().length > 0);
        if (fallback) parts.push(String(fallback).trim());
      }
      const joined = parts.join(" ").replace(/\s+/g, " ").trim();
      if (joined) return joined;

      const vals = Object.values(item)
        .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .filter(Boolean);
      return vals.join(" ").trim();
    }
    return String(item);
  }

// ── Prompt builder ────────────────────────────────────────────────────────────
const SPICE_LABELS = [
  "Mild (no heat at all)",
  "Gentle (a hint of warmth)",
  "Medium (moderate heat)",
  "Hot (clearly spicy)",
  "Extra Hot (very intense heat)",
];

function buildPrompt(
  inventory: InventoryItem[],
  preferences: UserPreferences | null,
  activeTrend: string,
  mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"],
  specialInstructions: string | null = null,
  count: number = 5
): string {
  const inventoryList =
    inventory.length > 0
      ? inventory
          .slice(0, 60)
          .map((i) => `${i.quantity}${i.quantity_unit ?? ""} ${i.name}`)
          .join(", ")
      : "No inventory provided";

  const forbidden = preferences?.allergies ?? [];
  const activeDiets = preferences?.diets ?? [];
  const noGoItems = preferences?.noGoItems ?? [];
  const cuisines = preferences?.cuisines ?? [];
  const spice = SPICE_LABELS[preferences?.spiceLevel ?? 2];
  const equipment = preferences?.equipment ?? [];
  const skill = preferences?.skillLevel ?? "intermediate";
  const fusion = preferences?.fusionMode ? "on" : "off";
  const mealTypesList = mealTypes.join(", ");
  const jsonKeys = mealTypes.map((m) => `  "${m}": [ ...exactly ${count} items ]`).join(",\n");

  return [
    `You are a professional nutritionist and chef for Noura.`,
    ``,
    `Task: For each meal type (${mealTypesList}) produce exactly ${count} unique recipes in JSON only.`,
    ``,
    `HARD (never violate):`,
    `1) NEVER use these allergens: ${forbidden.length ? forbidden.join(", ") : "none"}.`,
    `2) MUST comply with diets: ${activeDiets.length ? activeDiets.join(", ") : "none"}.`,
    `3) SPECIAL INSTRUCTIONS (MUST FOLLOW): ${specialInstructions && String(specialInstructions).trim() ? String(specialInstructions).trim() : "none"}.`,
    ``,
    `Soft prefs (do not reduce count): Avoid: ${noGoItems.join(", ") || "none"}; Cuisines: ${cuisines.join(", ") || "any"}; Spice: ${spice}; Equipment: ${equipment.join(", ") || "standard"}; Skill: ${skill}; Fusion: ${fusion}.`,
    ``,
    `Inventory: ${inventoryList}`,
    ``,
    `Return only a JSON object with keys: {`,
    `${jsonKeys}`,
    `}`,
    ``,
    `Each recipe object: {"name":"...","description":"2-3 short sentences","calories":Number,"prepTime":Number,"imageQuery":"...","ingredients":["qty ingredient"],"instructions":"1. ...\\n2. ...\\n3. ...\\n4. ...","protein_g":Number,"fat_g":Number,"carbs_g":Number}`,
    ``,
      `Rules: instructions = 4 short numbered steps (keep each step concise). Descriptions MUST be 2-3 sentences. Be brief and use plain JSON.`,
      `INGREDIENTS MUST be plain strings formatted as quantity + unit + ingredient name (examples: "2 cups rolled oats", "1 tbsp olive oil"). Do NOT return ingredient objects or arrays; return simple strings only.`,
      ``,
  ].join("\n");
}

// ── Gemini API caller ─────────────────────────────────────────────────────────
// Per-call max_tokens budget.
const MAX_TOKENS: Record<string, number> = {
  [PRIMARY_MODEL]: 2500,
};

async function callGemini(prompt: string): Promise<Response> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not configured");

  const maxTokens = MAX_TOKENS[PRIMARY_MODEL] ?? 7500;
  const url = new URL(GEMINI_API_URL);
  url.searchParams.set("key", apiKey);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: "You are a helpful culinary assistant. Always respond with valid JSON only, no markdown code blocks." }],
    },
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  };

  // Log the final prompt being sent to Gemini for debugging
  try {
    console.log("[callGemini] prompt:", prompt);
  } catch (e) {
    // ignore logging errors
  }

  return fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Response parser + image enrichment ───────────────────────────────────────
async function parseAndEnrichRecipes(
  rawJson: string,
  unsplashKey: string | undefined,
  count: number = 5
): Promise<GeneratedRecipes> {
  const parsed: RawGenerated = JSON.parse(rawJson || "{}");
  const ALL_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];
  const returnedMeals: MealType[] = Object.keys(parsed).length
    ? (Object.keys(parsed) as MealType[])
    : ALL_MEAL_TYPES;

  const imageFetches: Promise<string>[] = [];
  for (const meal of returnedMeals) {
    const list = (parsed[meal] ?? []).slice(0, count);
    list.forEach((r: RawRecipe) => {
      r.name = sanitizeDishName(String(r.name ?? ""));
      imageFetches.push(
        unsplashKey
          ? fetchUnsplashImage(String(r.name || r.imageQuery || ""), unsplashKey, FALLBACK_IMAGES[meal])
          : Promise.resolve(FALLBACK_IMAGES[meal])
      );
    });
  }

  const imageResults = await Promise.allSettled(imageFetches);

  const result = {} as GeneratedRecipes;
  for (const m of ALL_MEAL_TYPES) result[m] = [];

  let globalIdx = 0;
  for (const meal of returnedMeals) {
    const list = (parsed[meal] ?? []).slice(0, count);
    result[meal] = list.map((r: RawRecipe, i: number) => {
      const settled = imageResults[globalIdx++];
      return {
        id: i + 1,
        name: r.name,
        description: r.description,
        calories: Number(r.calories) || 0,
        image: settled.status === "fulfilled" ? (settled.value as string) : FALLBACK_IMAGES[meal],
        ingredients: Array.isArray(r.ingredients)
          ? (r.ingredients as any[]).map(stringifyIngredient).filter(Boolean)
          : [],
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

// ── Simple in-memory cache + job queue (ephemeral) ──────────────────────────
type JobStatus = "pending" | "running" | "done" | "failed";
interface JobEntry {
  id: string;
  status: JobStatus;
  result?: GeneratedRecipes;
  error?: string;
  requestKey?: string;
  createdAt: number;
  updatedAt: number;
}

const JOBS = new Map<string, JobEntry>();
const CACHE = new Map<string, { recipes: GeneratedRecipes; createdAt: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function canonicalize(value: any): any {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const keys = Object.keys(value).sort();
  const out: any = {};
  for (const k of keys) out[k] = canonicalize(value[k]);
  return out;
}

function computeRequestKey(obj: any): string {
  const s = JSON.stringify(canonicalize(obj));
  return createHash("sha256").update(s).digest("hex");
}

// ── Route handlers ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const {
      inventory = [],
      activeTrend,
      preferences = null,
      specialInstructions = null,
      mealTypes = ["breakfast", "lunch", "dinner", "snacks"],
      count = 5,
      background = true,
    } = body as Partial<GenerateRequest>;

    if (!activeTrend) {
      return NextResponse.json({ error: "Missing required field: activeTrend" }, { status: 400 });
    }

    const requestKey = computeRequestKey({ inventory, preferences, activeTrend, specialInstructions, mealTypes, count });
    const cached = CACHE.get(requestKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
      return NextResponse.json({ recipes: cached.recipes, cached: true });
    }

    const jobId = randomUUID();
    JOBS.set(jobId, { id: jobId, status: "pending", requestKey, createdAt: Date.now(), updatedAt: Date.now() });

    async function runCall(prompt: string, label: string): Promise<string> {
      const MAX_ATTEMPTS = 3;
      let attempt = 0;
      let lastErr: Error | null = null;

      while (attempt < MAX_ATTEMPTS) {
        attempt++;
        try {
          let res = await callGemini(prompt);
          if (res.status === 429 || res.status === 413) {
            // Rate limited or payload too large on primary. Use exponential backoff and retry same model.
            const base = Math.pow(2, attempt) * 1000;
            const jitter = Math.floor(Math.random() * 500);
            const waitMs = base + jitter;
            console.warn(`[generate:${label}] primary ${res.status} — rate limited, retrying in ${waitMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          if (!res.ok) {
            const errBody = await res.text();
            console.error(`[generate:${label}] Gemini error (attempt ${attempt})`, res.status, errBody);
            try {
              const parsed = JSON.parse(errBody) as { error?: { message?: string; code?: string } };
              const rawMsg = parsed?.error?.message ?? errBody;
              const isRate = parsed?.error?.code === "rate_limit_exceeded" || /rate limit/i.test(rawMsg);
              if (isRate && attempt < MAX_ATTEMPTS) {
                const base = Math.pow(2, attempt) * 1000;
                const jitter = Math.floor(Math.random() * 500);
                const waitMs = base + jitter;
                console.warn(`[generate:${label}] rate-limited, retrying in ${waitMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
                await new Promise((r) => setTimeout(r, waitMs));
                continue;
              }
              let friendlyMsg: string;
              if (parsed?.error?.code === "rate_limit_exceeded" || /rate limit/i.test(rawMsg)) {
                const m = rawMsg.match(/Please try again in ([0-9.]+)s/i);
                const seconds = m ? Math.ceil(Number(m[1])) : null;
                friendlyMsg = seconds && Number.isFinite(seconds)
                  ? `The AI service is temporarily busy. Please wait about ${seconds} second${seconds === 1 ? "" : "s"} and try again.`
                  : `The AI service is temporarily busy due to rate limits. Please try again shortly.`;
              } else {
                friendlyMsg = rawMsg;
              }
              throw new Error(`AI service error (${res.status}): ${friendlyMsg}`);
            } catch (parseErr) {
              lastErr = new Error(`AI service error (${res.status}): ${errBody}`);
              if (attempt < MAX_ATTEMPTS) {
                const waitMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
                await new Promise((r) => setTimeout(r, waitMs));
                continue;
              }
              throw lastErr;
            }
          }

          const data = await res.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_ATTEMPTS) {
            const waitMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
            console.warn(`[generate:${label}] request failed (attempt ${attempt}), retrying in ${waitMs}ms`, lastErr.message);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          throw lastErr;
        }
      }
      throw lastErr ?? new Error("AI service error: unknown failure");
    }

    // Background job (non-blocking)
    (async () => {
      JOBS.set(jobId, { id: jobId, status: "running", requestKey, createdAt: JOBS.get(jobId)!.createdAt, updatedAt: Date.now() });
      try {
        const inv = inventory ?? [];
        const prefs = preferences ?? null;
        const unsplashKey = (process.env.UNSPLASH_ACCESS_KEY ?? process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY)?.trim();

        const aggregated: GeneratedRecipes = { breakfast: [], lunch: [], dinner: [], snacks: [] };

        for (const m of mealTypes) {
          const prompt = buildPrompt(inv, prefs, activeTrend, [m], specialInstructions ?? null, count);
          const content = await runCall(prompt, m);
          const parsed = await parseAndEnrichRecipes(content, unsplashKey, count);
          aggregated[m] = parsed[m] ?? [];
        }

        CACHE.set(requestKey, { recipes: aggregated, createdAt: Date.now() });
        JOBS.set(jobId, { id: jobId, status: "done", result: aggregated, requestKey, createdAt: JOBS.get(jobId)!.createdAt, updatedAt: Date.now() });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        JOBS.set(jobId, { id: jobId, status: "failed", error: message, requestKey, createdAt: JOBS.get(jobId)!.createdAt, updatedAt: Date.now() });
        console.error(`[generate:${jobId}] background job failed`, err);
      }
    })();

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[generate] unexpected error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }
    const job = JOBS.get(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ id: job.id, status: job.status, result: job.result, error: job.error });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
