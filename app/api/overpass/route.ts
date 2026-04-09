import { NextResponse } from "next/server";

import { buildFullOverpassQuery, buildLightOverpassQuery } from "@/lib/overpass-query";

/** Public mirrors (first is often less loaded than the main endpoint). */
const MIRRORS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
] as const;

function isRetryableHttpStatus(status: number): boolean {
  return status === 504 || status === 502 || status === 503 || status === 429;
}

function overpassResponseLooksBroken(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return true;
  }
  const o = data as { remark?: string; elements?: unknown };
  if (typeof o.remark === "string") {
    const r = o.remark.toLowerCase();
    if (r.includes("error") || r.includes("timeout") || r.includes("too many")) {
      return true;
    }
  }
  return !Array.isArray(o.elements);
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as { lat?: unknown; lng?: unknown; radiusM?: unknown };
  const lat = typeof b.lat === "number" ? b.lat : Number.NaN;
  const lng = typeof b.lng === "number" ? b.lng : Number.NaN;
  const radiusM = typeof b.radiusM === "number" ? b.radiusM : Number.NaN;

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: "Invalid lat." }, { status: 400 });
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Invalid lng." }, { status: 400 });
  }
  if (!Number.isFinite(radiusM) || radiusM < 50 || radiusM > 50_000) {
    return NextResponse.json({ error: "Invalid radiusM (50–50000)." }, { status: 400 });
  }

  const queryPlans: { label: string; build: (lat: number, lng: number, r: number) => string }[] = [
    { label: "full", build: buildFullOverpassQuery },
    { label: "light", build: buildLightOverpassQuery },
  ];

  let lastStatus = 504;

  for (const plan of queryPlans) {
    const query = plan.build(lat, lng, radiusM);
    for (const base of MIRRORS) {
      try {
        const res = await fetch(base, {
          method: "POST",
          body: query,
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          signal: AbortSignal.timeout(90_000),
        });

        lastStatus = res.status;
        const text = await res.text();

        if (isRetryableHttpStatus(res.status)) {
          continue;
        }

        if (!res.ok) {
          return NextResponse.json(
            {
              error: `Overpass HTTP ${res.status}`,
              detail: text.slice(0, 400),
            },
            { status: res.status },
          );
        }

        let data: unknown;
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          continue;
        }

        if (overpassResponseLooksBroken(data)) {
          continue;
        }

        return NextResponse.json(data);
      } catch {
        continue;
      }
    }
  }

  return NextResponse.json(
    {
      error:
        "OpenStreetMap search timed out on all servers (they are often busy). Wait a minute, zoom to a smaller area, or try again.",
    },
    { status: lastStatus >= 400 ? lastStatus : 504 },
  );
}

export const maxDuration = 120;
