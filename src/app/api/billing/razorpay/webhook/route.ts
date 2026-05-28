import { getRazorpayPlanIdForPlan, isBillingPlan, type BillingInterval, type BillingPlan } from "@/lib/billing";
import prisma from "@/lib/prisma";
import { captureProductEvent } from "@/lib/product-analytics";
import { verifyRazorpayWebhook } from "@/lib/razorpay";
import { markWebhookEventReceived } from "@/lib/webhook-events";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RazorpaySubscriptionEntity = {
  id?: string;
  plan_id?: string | null;
  customer_id?: string | null;
  status?: string | null;
  current_end?: number | null;
  notes?: Record<string, string | undefined> | null;
};

type RazorpayWebhookPayload = {
  id?: string;
  event?: string;
  payload?: {
    subscription?: {
      entity?: RazorpaySubscriptionEntity;
    };
    payment?: {
      entity?: {
        id?: string;
        subscription_id?: string | null;
      };
    };
  };
};

function dateFromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

function getPlanFromPayload(subscription: RazorpaySubscriptionEntity) {
  const notes = subscription?.notes ?? {};
  const metadataPlan = notes.plan;
  if (isBillingPlan(metadataPlan)) return metadataPlan;

  const planId = subscription?.plan_id ?? null;
  for (const plan of ["starter", "studio", "elite", "scale"] as const) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (getRazorpayPlanIdForPlan(plan, interval) === planId) return plan;
    }
  }

  return "free" satisfies BillingPlan;
}

function getIntervalFromPayload(subscription: RazorpaySubscriptionEntity) {
  const notes = subscription?.notes ?? {};
  if (notes.interval === "monthly" || notes.interval === "yearly") return notes.interval;

  const planId = subscription?.plan_id ?? null;
  for (const plan of ["starter", "studio", "elite", "scale"] as const) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (getRazorpayPlanIdForPlan(plan, interval) === planId) return interval;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing Razorpay signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  try {
    if (!verifyRazorpayWebhook(rawBody, signature)) {
      return NextResponse.json({ ok: false, message: "Invalid Razorpay signature." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify Razorpay webhook.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }

  const event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const subscription = event.payload?.subscription?.entity;
  const payment = event.payload?.payment?.entity;
  const subscriptionId = subscription?.id ?? payment?.subscription_id ?? null;
  const eventId =
    req.headers.get("x-razorpay-event-id")?.trim() ||
    event.id ||
    `${event.event ?? "unknown"}:${subscriptionId ?? "none"}:${payment?.id ?? "none"}:${subscription?.status ?? "none"}`;
  const eventRecord = await markWebhookEventReceived({
    provider: "razorpay",
    eventId,
    eventType: event.event ?? null,
  });
  if (eventRecord.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!subscriptionId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const existing = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionId },
    select: { userId: true },
  });
  const userId = existing?.userId ?? subscription?.notes?.pixoraUserId;
  if (!userId) {
    console.warn("[razorpay:webhook] subscription event could not be mapped to a Pixora user", { subscriptionId });
    return NextResponse.json({ ok: true, unmapped: true });
  }

  const plan = subscription ? getPlanFromPayload(subscription) : undefined;
  const interval = subscription ? (getIntervalFromPayload(subscription) as BillingInterval | null) : null;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      provider: "razorpay",
      razorpayCustomerId: subscription?.customer_id ?? undefined,
      razorpaySubscriptionId: subscriptionId,
      razorpayPlanId: subscription?.plan_id ?? undefined,
      razorpayPaymentId: payment?.id ?? undefined,
      plan,
      interval,
      status: subscription?.status ?? (payment?.id ? "active" : undefined),
      currentPeriodEnd: dateFromUnix(subscription?.current_end),
      cancelAtPeriodEnd: subscription?.status === "cancelled",
    },
    create: {
      userId,
      provider: "razorpay",
      razorpayCustomerId: subscription?.customer_id ?? null,
      razorpaySubscriptionId: subscriptionId,
      razorpayPlanId: subscription?.plan_id ?? null,
      razorpayPaymentId: payment?.id ?? null,
      plan: plan ?? "free",
      interval,
      status: subscription?.status ?? (payment?.id ? "active" : "created"),
      currentPeriodEnd: dateFromUnix(subscription?.current_end),
      cancelAtPeriodEnd: subscription?.status === "cancelled",
    },
  });

  const status = subscription?.status ?? (payment?.id ? "active" : "created");
  void captureProductEvent(status === "active" || status === "authenticated" ? "payment_success" : "payment_failure", userId, {
    provider: "razorpay",
    status,
    subscriptionId,
    event: event.event ?? null,
  });

  return NextResponse.json({ ok: true });
}
