import prisma from "@/lib/prisma";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { withApiHandler } from "@/lib/withApiHandler";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getOrigin(req: NextRequest) {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL?.trim() ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

export const POST = withApiHandler(async (req: NextRequest) => {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) return blocked;

  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, message: "Session expired. Please log in again." }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, message: "Stripe billing portal is not enabled." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { subscription: { select: { stripeCustomerId: true } } },
  });

  const customerId = user?.subscription?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ ok: false, message: "No Stripe customer found for this account." }, { status: 404 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getOrigin(req)}/dashboard/settings?tab=plan`,
  });

  return NextResponse.json({ ok: true, url: session.url });
});
