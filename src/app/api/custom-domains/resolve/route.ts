import { normalizeDomainHost, resolveVerifiedCustomDomain } from "@/lib/custom-domains";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const host = normalizeDomainHost(searchParams.get("host"));
  if (!host) return NextResponse.json({ ok: false, message: "Invalid host." }, { status: 400 });

  const domain = await resolveVerifiedCustomDomain(host);
  if (!domain) return NextResponse.json({ ok: false, message: "Domain not found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    domain: domain.domain,
    userId: domain.userId,
  });
});
