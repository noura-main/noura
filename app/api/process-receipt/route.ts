import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No Groq Key" }, { status: 500 });

    const groq = new Groq({ apiKey });
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const scanMode = formData.get("scanMode") as string;
    const userId = formData.get("userId") as string;

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    const systemPrompt = scanMode === "Eating Out" 
      ? `Extract restaurant total. Return JSON: {"transactions": [{"location": "Name", "items": ["Dining"], "amount": 0.00, "date": "YYYY-MM-DD", "type": "Eating Out"}]}`
      : `Extract individual grocery food items. Return JSON: {"transactions": [{"location": "Store", "items": ["Item"], "amount": 0.00, "date": "YYYY-MM-DD", "type": "Groceries"}]}`;

    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const rawContent = chatCompletion.choices[0].message.content || "{}";
    const parsedData = JSON.parse(rawContent);
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