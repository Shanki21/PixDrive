import {
  getPriceIdForPlan,
  isBillingInterval,
  isBillingPlan,
  type BillingInterval,
  type BillingPlan,
} from "@/lib/billing";
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
    return NextResponse.json(
      { ok: false, message: "Stripe is not enabled for this Pixora environment. Use Razorpay for India beta billing." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown; interval?: unknown };
  const plan = isBillingPlan(body.plan) ? body.plan : null;
  const interval: BillingInterval = isBillingInterval(body.interval) ? body.interval : "monthly";

  if (!plan || plan === "free") {
    return NextResponse.json({ ok: false, message: "Choose a paid Pixora plan." }, { status: 400 });
  }

  const priceId = getPriceIdForPlan(plan as Exclude<BillingPlan, "free">, interval);
  if (!priceId) {
    return NextResponse.json(
      { ok: false, message: `Stripe price id is missing for the ${plan} ${interval} plan.` },
      { status: 500 }
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
    select: {
      id: true,
      email: true,
      subscription: { select: { stripeCustomerId: true } },
    },
  });

  const stripe = getStripe();
  let customerId = user.subscription?.stripeCustomerId ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { provider: "stripe", stripeCustomerId: customerId },
      create: {
        userId: user.id,
        provider: "stripe",
        stripeCustomerId: customerId,
      },
    });
  }

  const origin = getOrigin(req);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard/settings?tab=plan&billing=success`,
    cancel_url: `${origin}/dashboard/settings?tab=plan&billing=cancelled`,
    metadata: {
      userId: user.id,
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ ok: false, message: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url: session.url });
});
