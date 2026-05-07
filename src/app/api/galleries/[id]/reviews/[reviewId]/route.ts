import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ...rest: unknown[]) {
  const context = (rest[0] as { params?: Promise<{ id: string; reviewId: string }> }) ?? {};
  const params = (context.params ?? (Promise.resolve({ id: "", reviewId: "" } as { id: string; reviewId: string }))) as Promise<{ id: string; reviewId: string }>;
  const { id, reviewId } = await params;

  const review = { id: reviewId, galleryId: id, name: "Guest", rating: 5, comment: "" };
  return NextResponse.json({ ok: true, review });
}

export async function PATCH(req: NextRequest, ...rest: unknown[]) {
  const context = (rest[0] as { params?: Promise<{ id: string; reviewId: string }> }) ?? {};
  const params = (context.params ?? (Promise.resolve({ id: "", reviewId: "" } as { id: string; reviewId: string }))) as Promise<{ id: string; reviewId: string }>;
  const { id, reviewId } = await params;

  const body = (await req.json().catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;
  return NextResponse.json({ ok: true, galleryId: id, reviewId, updated: body });
}

export async function DELETE(req: NextRequest, ...rest: unknown[]) {
  const context = (rest[0] as { params?: Promise<{ id: string; reviewId: string }> }) ?? {};
  const params = (context.params ?? (Promise.resolve({ id: "", reviewId: "" } as { id: string; reviewId: string }))) as Promise<{ id: string; reviewId: string }>;
  const { id, reviewId } = await params;

  return NextResponse.json({ ok: true, deleted: true, galleryId: id, reviewId });
}
