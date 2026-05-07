import { getClientIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";

type GeoInfo = {
  city?: string;
  region?: string;
  country?: string;
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;
  const geo = (req as NextRequest & { geo?: GeoInfo }).geo ?? null;

  return NextResponse.json({
    ip,
    userAgent: ua,
    location:
      geo && (geo.city || geo.region || geo.country)
        ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ")
        : null,
  });
}
