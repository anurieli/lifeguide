import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }

  const body = (await req.json().catch(() => ({}))) as {
    event?: string;
    meta?: Record<string, unknown>;
  };
  console.info("[client-log]", body.event ?? "event", body.meta ?? {});
  return NextResponse.json({ ok: true });
}
