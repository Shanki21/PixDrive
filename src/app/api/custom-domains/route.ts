import {
  CUSTOM_DOMAIN_STATUS,
  createDomainVerificationToken,
  getDomainDnsTarget,
  getTxtRecordName,
  normalizeDomainHost,
} from "@/lib/custom-domains";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";
import { ensureCanUseCustomDomain } from "@/lib/billing";

export const runtime = "nodejs";

function serializeDomain(domain: {
  id: string;
  domain: string;
  verificationToken: string;
  status: string;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
}) {
  return {
    ...domain,
    verified: domain.status === CUSTOM_DOMAIN_STATUS.verified && Boolean(domain.verifiedAt),
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
    records: {
      txt: {
        type: "TXT",
        name: getTxtRecordName(domain.domain),
        value: domain.verificationToken,
      },
      cname: {
        type: "CNAME",
        name: domain.domain,
        value: getDomainDnsTarget(),
      },
    },
  };
}

async function getCurrentUser(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const domains = await prisma.customDomain.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domain: true,
      verificationToken: true,
      status: true,
      verifiedAt: true,
      lastCheckedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    domains: domains.map(serializeDomain),
    cnameTarget: getDomainDnsTarget(),
  });
});

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;

    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

    const planCheck = await ensureCanUseCustomDomain(user.id);
    if (!planCheck.ok) {
      return NextResponse.json(
        { ok: false, code: "PLAN_UPGRADE_REQUIRED", message: planCheck.message, billing: planCheck.billing },
        { status: 402 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { domain?: unknown };
    const domain = normalizeDomainHost(body.domain);
    if (!domain) {
      return NextResponse.json({ ok: false, message: "Enter a valid custom domain." }, { status: 400 });
    }

    const existing = await prisma.customDomain.findUnique({ where: { domain }, select: { userId: true } });
    if (existing && existing.userId !== user.id) {
      return NextResponse.json({ ok: false, message: "This domain is already connected to another Pixdrive account." }, { status: 409 });
    }

    const customDomain = await prisma.customDomain.upsert({
      where: { domain },
      update: {
        userId: user.id,
        status: CUSTOM_DOMAIN_STATUS.pending,
        verifiedAt: null,
        lastCheckedAt: null,
      },
      create: {
        userId: user.id,
        domain,
        verificationToken: createDomainVerificationToken(),
      },
      select: {
        id: true,
        domain: true,
        verificationToken: true,
        status: true,
        verifiedAt: true,
        lastCheckedAt: true,
      },
    });

    return NextResponse.json({ ok: true, domain: serializeDomain(customDomain) });
  }, { keyPrefix: "custom-domains:create", limit: 12, windowMs: 60 * 60 * 1000 })
);

export const DELETE = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;

    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, message: "Domain id is required." }, { status: 400 });

    await prisma.customDomain.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  }, { keyPrefix: "custom-domains:delete", limit: 20, windowMs: 60 * 60 * 1000 })
);
