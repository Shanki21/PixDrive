import prisma from "@/lib/prisma";
import {
  BILLING_PLANS,
  PLAN_LABELS,
  PLAN_LIMITS,
  RAZORPAY_PLAN_ENV,
  type BillingInterval,
  type BillingPlan,
  type PaidBillingPlan,
} from "@/lib/billing-plans";

export { BILLING_PLANS, PLAN_LABELS, PLAN_LIMITS };
export type { BillingInterval, BillingPlan };
export type BillingProvider = "manual" | "razorpay" | "stripe";

const PRICE_ENV: Record<Exclude<BillingPlan, "free">, Record<BillingInterval, string>> = {
  starter: {
    monthly: "STRIPE_PRICE_STARTER_MONTHLY",
    yearly: "STRIPE_PRICE_STARTER_YEARLY",
  },
  studio: {
    monthly: "STRIPE_PRICE_STUDIO_MONTHLY",
    yearly: "STRIPE_PRICE_STUDIO_YEARLY",
  },
  elite: {
    monthly: "STRIPE_PRICE_ELITE_MONTHLY",
    yearly: "STRIPE_PRICE_ELITE_YEARLY",
  },
  scale: {
    monthly: "STRIPE_PRICE_SCALE_MONTHLY",
    yearly: "STRIPE_PRICE_SCALE_YEARLY",
  },
};

const PRICE_ID_TO_PLAN = new Map<string, { plan: BillingPlan; interval: BillingInterval }>();

for (const plan of ["starter", "studio", "elite", "scale"] as const) {
  for (const interval of ["monthly", "yearly"] as const) {
    const priceId = process.env[PRICE_ENV[plan][interval]]?.trim();
    if (priceId) PRICE_ID_TO_PLAN.set(priceId, { plan, interval });
  }
}

export function isBillingPlan(value: unknown): value is BillingPlan {
  return BILLING_PLANS.includes(value as BillingPlan);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

export function isSubscriptionActive(status: string | null | undefined) {
  return status === "active" || status === "trialing" || status === "authenticated";
}

export function getPriceIdForPlan(plan: BillingPlan, interval: BillingInterval) {
  if (plan === "free") return null;
  return process.env[PRICE_ENV[plan][interval]]?.trim() || null;
}

export function getPlanForPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  return PRICE_ID_TO_PLAN.get(priceId) ?? null;
}

export function getRazorpayPlanIdForPlan(plan: PaidBillingPlan, interval: BillingInterval) {
  return process.env[RAZORPAY_PLAN_ENV[plan][interval]]?.trim() || null;
}

export function getRazorpayBillingConfigStatus() {
  const plans = Object.fromEntries(
    (["starter", "studio", "elite", "scale"] as const).map((plan) => [
      plan,
      {
        monthly: Boolean(getRazorpayPlanIdForPlan(plan, "monthly")),
        yearly: Boolean(getRazorpayPlanIdForPlan(plan, "yearly")),
      },
    ])
  ) as Record<PaidBillingPlan, Record<BillingInterval, boolean>>;

  return {
    keyConfigured: Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()),
    webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
    plans,
  };
}

export async function getUserBillingState(userId: string) {
  const [subscription, galleryCount, photoCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        provider: true,
        interval: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        razorpayCustomerId: true,
        razorpaySubscriptionId: true,
        razorpayPlanId: true,
        razorpayPaymentId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
    prisma.gallery.count({ where: { userId, deletedAt: null } }),
    prisma.photo.count({ where: { gallery: { userId, deletedAt: null } } }),
  ]);

  const activePlan = isSubscriptionActive(subscription?.status)
    ? subscription?.plan
    : "free";
  const plan = isBillingPlan(activePlan) ? activePlan : "free";
  const limits = PLAN_LIMITS[plan];

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    status: subscription?.status ?? "inactive",
    provider: (subscription?.provider as BillingProvider | undefined) ?? "manual",
    interval: subscription?.interval ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    usage: {
      galleries: galleryCount,
      photos: photoCount,
    },
    limits,
    stripeCustomerId: subscription?.stripeCustomerId ?? null,
    stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
    stripePriceId: subscription?.stripePriceId ?? null,
    razorpayCustomerId: subscription?.razorpayCustomerId ?? null,
    razorpaySubscriptionId: subscription?.razorpaySubscriptionId ?? null,
    razorpayPlanId: subscription?.razorpayPlanId ?? null,
    razorpayPaymentId: subscription?.razorpayPaymentId ?? null,
  };
}

export async function ensureCanCreateGallery(userId: string) {
  const billing = await getUserBillingState(userId);
  if (billing.usage.galleries >= billing.limits.galleryLimit) {
    return {
      ok: false as const,
      billing,
      message: `Your ${billing.planLabel} plan allows ${billing.limits.galleryLimit} active galleries. Upgrade to create more.`,
    };
  }

  return { ok: true as const, billing };
}

export async function ensureCanAddPhoto(userId: string, incomingPhotos = 1) {
  const billing = await getUserBillingState(userId);
  if (billing.usage.photos + incomingPhotos > billing.limits.photoLimit) {
    return {
      ok: false as const,
      billing,
      message: `Your ${billing.planLabel} plan allows ${billing.limits.photoLimit} photos. Upgrade to upload more.`,
    };
  }

  return { ok: true as const, billing };
}

export async function ensureCanUseCustomDomain(userId: string) {
  const billing = await getUserBillingState(userId);
  if (!billing.limits.customDomains) {
    return {
      ok: false as const,
      billing,
      message: "Custom domains are available on Studio, Pro Studio, and Scale plans.",
    };
  }
  const domainCount = await prisma.customDomain.count({ where: { userId } });
  if (domainCount >= billing.limits.customDomainLimit) {
    return {
      ok: false as const,
      billing,
      message: `Your ${billing.planLabel} plan includes ${billing.limits.customDomainLimit} custom domain${billing.limits.customDomainLimit === 1 ? "" : "s"}. Upgrade to connect more.`,
    };
  }

  return { ok: true as const, billing };
}
