import { NextRequest, NextResponse } from "next/server";

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;
  const geo = req.geo ?? null;

  return NextResponse.json({
    ip,
    userAgent: ua,
    location:
      geo && (geo.city || geo.region || geo.country)
        ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ")
        : null,
  });
}
