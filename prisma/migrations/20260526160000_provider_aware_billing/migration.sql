-- Add provider-aware billing state for India-first paid beta.
ALTER TABLE "Subscription"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "razorpayCustomerId" TEXT,
ADD COLUMN "razorpaySubscriptionId" TEXT,
ADD COLUMN "razorpayPlanId" TEXT,
ADD COLUMN "razorpayPaymentId" TEXT,
ADD COLUMN "interval" TEXT;

CREATE UNIQUE INDEX "Subscription_razorpayCustomerId_key" ON "Subscription"("razorpayCustomerId");
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "Subscription"("razorpaySubscriptionId");
CREATE INDEX "Subscription_provider_idx" ON "Subscription"("provider");
