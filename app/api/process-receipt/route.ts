import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No Gemini Key" }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const scanMode = formData.get("scanMode") as string;
    const userId = formData.get("userId") as string;

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    const systemPrompt = scanMode === "Eating Out"
      ? `Extract restaurant total. Return JSON: {"transactions": [{"location": "Name", "items": ["Dining"], "amount": 0.00, "date": "YYYY-MM-DD", "type": "Eating Out"}]}`
      : `Extract individual grocery food items. Return JSON: {"transactions": [{"location": "Store", "items": ["Item"], "amount": 0.00, "date": "YYYY-MM-DD", "type": "Groceries"}]}`;

    const GEMINI_API_BASE = process.env.NEXT_PUBLIC_GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
    const geminiUrl = new URL(GEMINI_API_BASE);
    geminiUrl.searchParams.set("key", apiKey);

    const mimeType = file.type || "image/jpeg";

    const res = await fetch(geminiUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { inlineData: { mimeType, data: base64Image } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini API error: ${res.status} ${String(errText)}`);
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsedData = JSON.parse(String(rawContent));
    const extracted = parsedData.transactions || (Array.isArray(parsedData) ? parsedData : [parsedData]);

    // Save to Supabase
    const { data: savedData, error: dbError } = await supabase
      .from("transactions")
      .insert(
        extracted.map((t: any) => ({
          location: t.location || "Unknown",
          items: Array.isArray(t.items) ? t.items : [t.name || "Item"],
          date: t.date || new Date().toISOString().split('T')[0],
          amount: parseFloat(t.amount) || 0,
          type: t.type || scanMode,
          result: "Done",
          user_id: userId,
        }))
      )
      .select();

    if (dbError) throw dbError;
    return NextResponse.json(savedData);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}