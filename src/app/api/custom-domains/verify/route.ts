import { CUSTOM_DOMAIN_STATUS, verifyDomainDns } from "@/lib/custom-domains";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;

    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, message: "Domain id is required." }, { status: 400 });

    const customDomain = await prisma.customDomain.findFirst({
      where: { id, user: { email } },
      select: { id: true, domain: true, verificationToken: true },
    });
    if (!customDomain) return NextResponse.json({ ok: false, message: "Domain not found." }, { status: 404 });

    const result = await verifyDomainDns(customDomain.domain, customDomain.verificationToken);
    const status = result.ok ? CUSTOM_DOMAIN_STATUS.verified : CUSTOM_DOMAIN_STATUS.misconfigured;
    const updated = await prisma.customDomain.update({
      where: { id: customDomain.id },
      data: {
        status,
        verifiedAt: result.ok ? new Date() : null,
        lastCheckedAt: new Date(),
      },
      select: {
        id: true,
        domain: true,
        status: true,
        verifiedAt: true,
        lastCheckedAt: true,
      },
    });

    return NextResponse.json({
      ok: result.ok,
      domain: {
        ...updated,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
        lastCheckedAt: updated.lastCheckedAt?.toISOString() ?? null,
      },
      checks: result.checks,
      message: result.ok ? "Domain verified." : "DNS records are not ready yet.",
    }, { status: result.ok ? 200 : 409 });
  }, { keyPrefix: "custom-domains:verify", limit: 20, windowMs: 60 * 60 * 1000 })
);

