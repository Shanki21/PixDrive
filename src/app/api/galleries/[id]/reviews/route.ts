import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ...rest: unknown[]) {
  const context = (rest[0] as { params?: Promise<{ id: string }> }) ?? {};
  const params = (context.params ?? (Promise.resolve({ id: "" } as { id: string }))) as Promise<{ id: string }>;
  const { id } = await params;

  return NextResponse.json({ ok: true, galleryId: id, items: [] });
}

export async function POST(req: NextRequest, ...rest: unknown[]) {
  const context = (rest[0] as { params?: Promise<{ id: string }> }) ?? {};
  const params = (context.params ?? (Promise.resolve({ id: "" } as { id: string }))) as Promise<{ id: string }>;
  const { id } = await params;

  const body = (await req.json().catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;

  const created = {
    id: `tmp-${Date.now()}`,
    galleryId: id,
    name: String(body.name ?? ""),
    rating: Number(body.rating ?? 0),
    comment: String(body.comment ?? ""),
  };

  return NextResponse.json({ ok: true, created }, { status: 201 });
}
