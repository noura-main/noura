import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

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

// ── Gemini call ──────────────────────────────────────────────────────────────
async function callGemini(ingredient: string): Promise<SwapResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_GEMINI_API_KEY not set");

  const url = new URL(GEMINI_API_URL);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `Ingredient: ${ingredient.trim()}` }] },
      ],
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText);
    console.error(`[ingredient-swap] Gemini error ${res.status}`, errBody);
    let friendlyMsg = typeof errBody === "string" ? errBody : String(errBody);
    try {
      const parsed = JSON.parse(String(errBody)) as { error?: { message?: string; code?: number } };
      const rawMsg = parsed?.error?.message ?? String(errBody);
      if (parsed?.error?.code === 429 || /rate limit/i.test(rawMsg)) {
        const m = rawMsg.match(/retry after ([0-9.]+)/i);
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
      // fall back to raw text
    }
    throw new Error(`AI service error (${res.status}): ${friendlyMsg}`);
  }

  const json = await res.json();
  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed: SwapResponse = JSON.parse(cleaned);

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


    let result: SwapResponse | undefined;
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        result = await callGemini(ingredient);
        break;
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          console.error("[ingredient-swap] All attempts failed", err);
          return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
        }
        const waitMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
        console.warn(`[ingredient-swap] attempt ${attempt} failed, retrying in ${waitMs}ms`, err instanceof Error ? err.message : String(err));
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    if (!result) return NextResponse.json({ error: "AI service failed" }, { status: 502 });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ingredient-swap] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
