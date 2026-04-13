import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SwapSuggestion {
  sub_name: string;
  usage_ratio: string;        // e.g. "1:1" or "¾ cup per 1 cup"
  est_cal: number;            // absolute kcal for the substitute amount
  est_protein_g: number;
  est_carb_g: number;
  est_fat_g: number;
  culinary_reasoning: string;
}

export interface OriginalMacros {
  name: string;
  est_cal: number;
  est_protein_g: number;
  est_carb_g: number;
  est_fat_g: number;
}

export interface SwapResponse {
  original: OriginalMacros;
  substitutes: SwapSuggestion[];
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are a culinary nutrition engine. Given a single ingredient name, you must:
1. Return the approximate nutritional values for a standard single-serving amount of that ingredient (e.g. "1 tbsp butter", "1 large egg", "1 cup flour").
2. Return exactly 3 practical substitutes for that ingredient.

You MUST respond with ONLY valid JSON — no markdown, no explanation text, no code fences.

The JSON schema is:
{
  "original": {
    "name": "<ingredient name with amount, e.g. '1 tbsp Butter'>",
    "est_cal": <number>,
    "est_protein_g": <number>,
    "est_carb_g": <number>,
    "est_fat_g": <number>
  },
  "substitutes": [
    {
      "sub_name": "<substitute name>",
      "usage_ratio": "<ratio e.g. '1:1' or '3/4 cup per 1 cup'>",
      "est_cal": <number>,
      "est_protein_g": <number>,
      "est_carb_g": <number>,
      "est_fat_g": <number>,
      "culinary_reasoning": "<one sentence culinary tip>"
    }
  ]
}

Rules:
- All numeric fields must be plain numbers (not strings).
- Provide exactly 3 substitutes.
- Nutritional values should all be for the SAME serving amount used in the original.
- Do NOT include any text outside the JSON object.`;
}

// ── Groq call ─────────────────────────────────────────────────────────────────
async function callGroq(ingredient: string, model: string, apiKey: string): Promise<SwapResponse> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: `Ingredient: ${ingredient.trim()}` },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Groq ${model} returned ${res.status}: ${err}`);
  }

  const json = await res.json();
  const raw: string = json.choices?.[0]?.message?.content ?? "";

  // Strip potential markdown code fences
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed: SwapResponse = JSON.parse(cleaned);

  // Basic validation
  if (!parsed.original || !Array.isArray(parsed.substitutes) || parsed.substitutes.length === 0) {
    throw new Error("LLM returned invalid swap schema");
  }

  return parsed;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ingredient: string = (body?.ingredient ?? "").trim();

    if (!ingredient) {
      return NextResponse.json({ error: "Missing 'ingredient' field." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }

    let result: SwapResponse;
    try {
      result = await callGroq(ingredient, PRIMARY_MODEL, apiKey);
    } catch (primaryErr) {
      console.warn("[ingredient-swap] Primary model failed, trying fallback:", primaryErr);
      result = await callGroq(ingredient, FALLBACK_MODEL, apiKey);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ingredient-swap] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
