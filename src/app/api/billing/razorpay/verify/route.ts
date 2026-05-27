import { isBillingInterval, isBillingPlan, type BillingInterval } from "@/lib/billing";
import prisma from "@/lib/prisma";
import { captureProductEvent } from "@/lib/product-analytics";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = withApiHandler(async (req: NextRequest) => {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) return blocked;

  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, message: "Session expired. Please log in again." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const paymentId = String(body.razorpay_payment_id ?? "").trim();
  const subscriptionId = String(body.razorpay_subscription_id ?? "").trim();
  const signature = String(body.razorpay_signature ?? "").trim();
  const plan = isBillingPlan(body.plan) ? body.plan : "free";
  const interval: BillingInterval = isBillingInterval(body.interval) ? body.interval : "monthly";

  if (!paymentId || !subscriptionId || !signature || plan === "free") {
    return NextResponse.json({ ok: false, message: "Missing Razorpay payment verification details." }, { status: 400 });
  }

  const signedPayload = `${paymentId}|${subscriptionId}`;
  if (!verifyRazorpaySignature(signedPayload, signature)) {
    return NextResponse.json({ ok: false, message: "Invalid Razorpay signature." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ ok: false, message: "Account not found." }, { status: 404 });
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      provider: "razorpay",
      razorpaySubscriptionId: subscriptionId,
      razorpayPaymentId: paymentId,
      plan,
      interval,
      status: "authenticated",
      cancelAtPeriodEnd: false,
    },
    create: {
      userId: user.id,
      provider: "razorpay",
      razorpaySubscriptionId: subscriptionId,
      razorpayPaymentId: paymentId,
      plan,
      interval,
      status: "authenticated",
      cancelAtPeriodEnd: false,
    },
  });

  void captureProductEvent("payment_success", user.id, {
    provider: "razorpay",
    plan,
    interval,
    subscriptionId,
  });

  return NextResponse.json({ ok: true });
});
