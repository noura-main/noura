import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    // 1. Setup API Key
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const scanMode = formData.get("scanMode") as string; // 'Groceries' or 'Eating Out'

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 3. Convert image to Base64
    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    // 4. Build Dynamic Prompt based on Scan Mode
    const systemPrompt = scanMode === "Eating Out" 
      ? `You are a restaurant receipt parser. 
         Extract ONLY the grand total and the restaurant name. 
         Return a JSON object with a "transactions" array containing exactly ONE object.
         Example: {"transactions": [{"location": "Pasta Palace", "items": ["Dining"], "amount": 45.50, "date": "2024-03-20", "type": "Eating Out"}]}`
      : `You are a grocery receipt parser. 
         Extract EVERY individual food item. Skip non-food items (bags, tax, soap).
         Return a JSON object with a "transactions" array where EACH item is its own object.
         Example: {"transactions": [{"location": "Safeway", "items": ["Milk"], "amount": 4.99, "date": "2024-03-20", "type": "Groceries"}]}`;

    // 5. Call Groq
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

    // 6. Final normalization to ensure the frontend always gets an array
    const transactions = parsedData.transactions || 
                         parsedData.items || 
                         (Array.isArray(parsedData) ? parsedData : [parsedData]);

    return NextResponse.json(transactions);

  } catch (error: any) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}