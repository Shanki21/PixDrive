import {
  getRazorpayPlanIdForPlan,
  isBillingInterval,
  isBillingPlan,
  type BillingInterval,
  type BillingPlan,
} from "@/lib/billing";
import prisma from "@/lib/prisma";
import { captureProductEvent } from "@/lib/product-analytics";
import { getRazorpayKeyId, razorpayRequest } from "@/lib/razorpay";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RazorpayCustomer = {
  id: string;
};

type RazorpaySubscription = {
  id: string;
  status?: string;
  current_end?: number | null;
  short_url?: string | null;
};

function dateFromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

export const POST = withApiHandler(async (req: NextRequest) => {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) return blocked;

  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, message: "Session expired. Please log in again." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown; interval?: unknown };
  const plan = isBillingPlan(body.plan) ? body.plan : null;
  const interval: BillingInterval = isBillingInterval(body.interval) ? body.interval : "monthly";

  if (!plan || plan === "free") {
    return NextResponse.json({ ok: false, message: "Choose a paid Pixora plan." }, { status: 400 });
  }

  const planId = getRazorpayPlanIdForPlan(plan as Exclude<BillingPlan, "free">, interval);
  if (!planId) {
    return NextResponse.json(
      { ok: false, message: `Razorpay plan id is missing for the ${plan} ${interval} plan.` },
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
      subscription: { select: { razorpayCustomerId: true } },
    },
  });

  let customerId = user.subscription?.razorpayCustomerId ?? null;
  if (!customerId) {
    const customer = await razorpayRequest<RazorpayCustomer>("/customers", {
      method: "POST",
      body: {
        email: user.email,
        notes: {
          pixoraUserId: user.id,
        },
      },
    });
    customerId = customer.id;
  }

  const subscription = await razorpayRequest<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: {
      plan_id: planId,
      customer_id: customerId,
      total_count: interval === "yearly" ? 10 : 120,
      quantity: 1,
      customer_notify: 0,
      notes: {
        pixoraUserId: user.id,
        plan,
        interval,
      },
    },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      provider: "razorpay",
      razorpayCustomerId: customerId,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: planId,
      plan,
      interval,
      status: subscription.status ?? "created",
      currentPeriodEnd: dateFromUnix(subscription.current_end),
      cancelAtPeriodEnd: false,
    },
    create: {
      userId: user.id,
      provider: "razorpay",
      razorpayCustomerId: customerId,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: planId,
      plan,
      interval,
      status: subscription.status ?? "created",
      currentPeriodEnd: dateFromUnix(subscription.current_end),
      cancelAtPeriodEnd: false,
    },
  });

  void captureProductEvent("plan_checkout_started", user.id, {
    provider: "razorpay",
    plan,
    interval,
    subscriptionId: subscription.id,
  });

  return NextResponse.json({
    ok: true,
    provider: "razorpay",
    keyId: getRazorpayKeyId(),
    subscriptionId: subscription.id,
    plan,
    interval,
    email: user.email,
    shortUrl: subscription.short_url ?? null,
  });
});
