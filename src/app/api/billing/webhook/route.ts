import { getPlanForPriceId, isBillingPlan } from "@/lib/billing";
import prisma from "@/lib/prisma";
import { captureProductEvent } from "@/lib/product-analytics";
import { getStripe } from "@/lib/stripe";
import { markWebhookEventReceived } from "@/lib/webhook-events";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

type SubscriptionSnapshot = {
  id: string;
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  status?: string | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  metadata?: Stripe.Metadata | null;
  items?: {
    data?: Array<{
      price?: { id?: string | null } | null;
    }>;
  };
};

function stripeId(value: string | { id?: string | null } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function dateFromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

function isSubscriptionPaidStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

async function upsertSubscriptionFromStripe(rawSubscription: Stripe.Subscription) {
  const subscription = rawSubscription as unknown as SubscriptionSnapshot;
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = stripeId(subscription.customer);
  const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const pricePlan = getPlanForPriceId(stripePriceId);
  const metadataPlan = subscription.metadata?.plan;
  const plan = pricePlan?.plan ?? (isBillingPlan(metadataPlan) ? metadataPlan : "free");
  const userIdFromMeta = subscription.metadata?.userId;

  const existing = stripeSubscriptionId
    ? await prisma.subscription.findUnique({ where: { stripeSubscriptionId }, select: { userId: true } })
    : null;
  const byCustomer =
    !existing && stripeCustomerId
      ? await prisma.subscription.findUnique({ where: { stripeCustomerId }, select: { userId: true } })
      : null;
  const userId = existing?.userId ?? byCustomer?.userId ?? userIdFromMeta;

  if (!userId) {
    console.warn("[stripe:webhook] subscription event could not be mapped to a Pixora user", {
      stripeSubscriptionId,
      stripeCustomerId,
    });
    return;
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      provider: "stripe",
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      plan,
      interval: pricePlan?.interval ?? null,
      status: subscription.status ?? "inactive",
      currentPeriodEnd: dateFromUnix(subscription.current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    },
    create: {
      userId,
      provider: "stripe",
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      plan,
      interval: pricePlan?.interval ?? null,
      status: subscription.status ?? "inactive",
      currentPeriodEnd: dateFromUnix(subscription.current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    },
  });

  void captureProductEvent(isSubscriptionPaidStatus(subscription.status) ? "payment_success" : "payment_failure", userId, {
    provider: "stripe",
    status: subscription.status ?? "inactive",
    subscriptionId: stripeSubscriptionId,
    plan,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);
  if (!userId) return;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      provider: "stripe",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    },
    create: {
      userId,
      provider: "stripe",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: isBillingPlan(session.metadata?.plan) ? session.metadata.plan : "free",
      status: "incomplete",
    },
  });

  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionFromStripe(subscription);
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, message: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  try {
    const eventRecord = await markWebhookEventReceived({
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
    });
    if (eventRecord.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe:webhook] failed to process event", event.type, error);
    return NextResponse.json({ ok: false, message: "Unable to process Stripe event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
