import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL ?? "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "gpt-4o-mini";

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_KEY || "");

async function extractWaitSeconds(rawMsg: string) {
  const m = rawMsg.match(/Please try again in ([0-9.]+)s/i);
  if (!m) return null;
  const s = Math.ceil(Number(m[1]));
  return Number.isFinite(s) ? s : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userId = body?.user_id ?? null;
    const sessionId = body?.session_id ?? null;
    const createSessionOnly = body?.create_session === true;

    if (createSessionOnly) {
      // Create a session and return it without calling the model
      if (!userId) return NextResponse.json({ error: "Missing user_id for session creation" }, { status: 400 });
      try {
        const { data: sdata, error: sErr } = await supabase
          .from("chat_sessions")
          .insert({ user_id: userId, title: null })
          .select()
          .single();
        if (sErr) throw sErr;
        return NextResponse.json({ session_id: sdata.id });
      } catch (err) {
        console.error("[assistant] session create failed", err);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
    }

    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages in request" }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API key is not configured" }, { status: 500 });
    }

    // Build personalization context from Supabase when possible
    let systemPrompt = "You are a friendly nutrition-focused assistant for the Noura app. Keep answers concise and helpful.";
    try {
      if (userId) {
        const [{ data: profile }, { data: dailyLogs }, { data: goals }] = await Promise.all([
          supabase.from("profiles").select("full_name,avatar_url").eq("id", userId).maybeSingle(),
          supabase.from("daily_logs").select("calories,protein,fat_g,carbs_g").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("user_nutrition_goals").select("calories,protein_g,carbs_g,fat_g").eq("user_id", userId).maybeSingle(),
        ]);

        const name = profile?.full_name ?? null;
        const today = dailyLogs?.calories != null ? `They've logged ${dailyLogs.calories} kcal, ${dailyLogs.protein ?? 0} g protein today.` : "No nutrition logged yet today.";
        const goalLine = goals?.calories ? `Their daily targets: ${goals.calories} kcal, ${goals.protein_g ?? "—"} g protein, ${goals.carbs_g ?? "—"} g carbs, ${goals.fat_g ?? "—"} g fat.` : "No nutrition targets set.";
        systemPrompt = `You are a friendly nutrition coach for ${name ?? "this user"}. ${today} ${goalLine} Answer as a helpful coach and relate suggestions to the user's goals when appropriate.`;
      }
    } catch (err) {
      console.warn("[assistant] failed to load personalization:", err);
    }

    // Prepend system prompt
    const payloadMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // Quick canned replies for common support questions (avoid external call)
    const lastUserMsg = messages[messages.length - 1];
    const lastUserText = String(lastUserMsg?.content ?? "").trim();
    let assistantContent = "";

    // Robust intent detection for "how to use" variants. Checks the current
    // user message and previous messages for mentions of Noura or the app so
    // short/ambiguous queries like "how to use?" are handled correctly.
    function mentionsNouraInMessages(msgs: any[]) {
      return msgs.some((m) => {
        const s = String(m?.content ?? "").toLowerCase();
        return /\bnoura\b/.test(s) || /\bthe app\b/.test(s) || /\bthis app\b/.test(s);
      });
    }

    function isHowToUseQuery(msgs: any[], text: string) {
      const t = String(text ?? "").toLowerCase();
      const explicit = [
        /how do i use noura/,
        /how to use noura/,
        /how can i use noura/,
        /how do i use the app/,
        /how to use the app/,
        /how does noura work/,
        /how does the app work/,
        /what does noura do/,
        /what can noura do/,
        /getting started/,
        /get started/,
      ];
      if (explicit.some((rx) => rx.test(t))) return true;

      // Generic patterns require a mention of the app/Noura somewhere in the
      // conversation to avoid false positives.
      const generic = /\b(how to|how do i|how can i|how|use|using|start|started|guide|usage|what can)\b/;
      if (generic.test(t)) {
        if (/\bnoura\b/.test(t) || /\bthe app\b/.test(t) || mentionsNouraInMessages(msgs)) return true;
      }

      // Short ambiguous queries rely entirely on context
      if (/^how to use\??$/.test(t) || /^how do i use\??$/.test(t) || /^how to\??$/.test(t)) {
        return mentionsNouraInMessages(msgs);
      }

      return false;
    }

    if (isHowToUseQuery(messages, lastUserText)) {
      assistantContent = `Here’s how to use Noura:

1) Input your ingredients: add items manually or scan receipts so Noura knows what’s in your kitchen.
2) Set preferences and restrictions: tell Noura dietary goals, allergies, or taste preferences for personalized suggestions.
3) Generate recipes or meal plans: use the recipe generator or meal planner to get tailored ideas and smart swaps based on your inventory and goals.
4) Save and cook: adjust quantities, save recipes, or add items to your meal plan; Noura will keep nutrition and shopping suggestions in sync.

Tip: Start by adding a few common staples (eggs, rice, spinach) and generate a quick plan: you can refine preferences later.`;
    } else {
      // Call OpenRouter
      const res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: payloadMessages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => res.statusText);
        console.error("[assistant] OpenRouter error", res.status, errBody);
        let friendly = typeof errBody === "string" ? errBody : String(errBody);
        try {
          const parsed = JSON.parse(String(errBody));
          const rawMsg = parsed?.error?.message ?? String(errBody);
          if (parsed?.error?.code === "rate_limit_exceeded" || /rate limit/i.test(rawMsg)) {
            const seconds = await extractWaitSeconds(rawMsg);
            friendly = seconds ? `The AI service is busy. Please wait about ${seconds} second${seconds === 1 ? "" : "s"} and try again.` : `The AI service is busy due to rate limits. Please try again shortly.`;
          } else {
            friendly = rawMsg;
          }
        } catch {
          // fall back
        }
        return NextResponse.json({ error: `AI service error (${res.status}): ${friendly}` }, { status: 502 });
      }

      const data = await res.json().catch(() => ({}));
      assistantContent = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
    }

    // Persist chat session + messages if user provided
    let createdSessionId = sessionId;
    try {
      if (userId) {
        if (!createdSessionId) {
          const { data: sdata, error: sErr } = await supabase
            .from("chat_sessions")
            .insert({ user_id: userId, title: null })
            .select()
            .single();
          if (!sErr && sdata) createdSessionId = sdata.id;
        }

        const now = new Date().toISOString();
        // Insert user message(s) and assistant reply
        const lastUser = messages[messages.length - 1];
        const inserts: any[] = [];
        if (lastUser) {
          inserts.push({ user_id: userId, chat_session_id: createdSessionId, role: lastUser.role ?? "user", content: String(lastUser.content ?? ""), metadata: null, created_at: now });
        }
        inserts.push({ user_id: userId, chat_session_id: createdSessionId, role: "assistant", content: String(assistantContent ?? ""), metadata: null, created_at: now });

        await supabase.from("chat_messages").insert(inserts);
      }
    } catch (err) {
      console.warn("[assistant] failed to persist chat:", err);
    }

    return NextResponse.json({ assistant_message: assistantContent, session_id: createdSessionId });
  } catch (err: any) {
    console.error("[assistant] unexpected error", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
