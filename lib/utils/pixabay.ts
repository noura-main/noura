export async function fetchPixabayImageClient(query: string): Promise<string> {
  try {
    const PIXABAY_API_KEY = process.env.NEXT_PUBLIC_PIXABAY_API_KEY ?? "";
    if (!PIXABAY_API_KEY) return "";

    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", PIXABAY_API_KEY);
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

    // Prefer tags that match query tokens
    const tokens = (query || "").toLowerCase().split(/[^a-z0-9]+/).filter((t: string) => t && t.length > 2);
    for (const hit of hits) {
      const tags = (hit.tags as string | undefined)?.toLowerCase() ?? "";
      for (const tk of tokens) {
        if (tags.includes(tk)) return hit.webformatURL as string;
      }
    }

    return hits[0].webformatURL as string;
  } catch {
    return "";
  }
}
