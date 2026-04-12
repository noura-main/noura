import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    console.info("[telemetry:image-fallback]", JSON.stringify(body ?? { raw: 'unparsed' }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telemetry:image-fallback] error parsing body", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
