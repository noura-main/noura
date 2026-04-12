import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function fetchPixabay(query: string): Promise<string> {
  try {
    const PIX_KEY = process.env.PIXABAY_API_KEY || process.env.NEXT_PUBLIC_PIXABAY_API_KEY || "";
    if (!PIX_KEY) return "";
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", PIX_KEY);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("category", "food");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "6");
    const res = await fetch(url.toString());
    if (!res.ok) return "";
    const data = await res.json();
    const hits = data.hits ?? [];
    if (!hits.length) return "";
    // prefer tag match
    const tokens = (query || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const hit of hits) {
      const tags = (hit.tags as string | undefined)?.toLowerCase() ?? "";
      for (const tk of tokens) if (tags.includes(tk)) return hit.webformatURL as string;
    }
    return hits[0].webformatURL as string;
  } catch (err) {
    console.error("[refresh-images] pixabay error", err);
    return "";
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-refresh-secret") || process.env.IMAGE_REFRESH_SECRET;
  const configured = process.env.IMAGE_REFRESH_SECRET;
  if (configured && secret !== configured) {
    return NextResponse.json({ error: "invalid secret" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "missing supabase url or service role key in env" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false } });

  const body = await req.json().catch(() => ({}));
  const force = Boolean(body.force);

  try {
    const { data: rows, error: selErr } = await supabase.from("user_ingredients").select("id, name, image_url");
    if (selErr) throw selErr;
    const toProcess = (rows ?? []).filter((r: any) => force || !r.image_url);

    const results: { id: string; name: string; image?: string; error?: string }[] = [];
    for (const row of toProcess) {
      try {
        const image = await fetchPixabay(row.name || "");
        if (!image) {
          results.push({ id: row.id, name: row.name, error: "no image found" });
          continue;
        }
        const { error: upErr } = await supabase.from("user_ingredients").update({ image_url: image }).eq("id", row.id);
        if (upErr) {
          results.push({ id: row.id, name: row.name, error: String(upErr.message || upErr) });
        } else {
          results.push({ id: row.id, name: row.name, image });
        }
      } catch (err) {
        results.push({ id: row.id, name: row.name, error: String(err) });
      }
    }

    return NextResponse.json({ updated: results.filter((r) => r.image).length, details: results });
  } catch (err) {
    console.error("[refresh-images] error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
