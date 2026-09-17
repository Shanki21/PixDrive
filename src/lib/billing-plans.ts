export const BILLING_PLANS = ["free", "starter", "studio", "elite", "scale"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];
export type BillingInterval = "monthly" | "yearly";

export type PlanLimits = {
  galleryLimit: number;
  photoLimit: number;
  storageLimitGb: number;
  customDomains: boolean;
  customDomainLimit: number;
  prioritySupport: boolean;
};

export type PaidBillingPlan = Exclude<BillingPlan, "free">;

export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: { galleryLimit: 1, photoLimit: 200, storageLimitGb: 2, customDomains: false, customDomainLimit: 0, prioritySupport: false },
  starter: { galleryLimit: 5, photoLimit: 2_000, storageLimitGb: 10, customDomains: false, customDomainLimit: 0, prioritySupport: false },
  studio: { galleryLimit: 25, photoLimit: 10_000, storageLimitGb: 50, customDomains: true, customDomainLimit: 1, prioritySupport: false },
  elite: { galleryLimit: 75, photoLimit: 30_000, storageLimitGb: 150, customDomains: true, customDomainLimit: 3, prioritySupport: true },
  scale: { galleryLimit: 200, photoLimit: 100_000, storageLimitGb: 500, customDomains: true, customDomainLimit: 10, prioritySupport: true },
};

export const PLAN_LABELS: Record<BillingPlan, string> = {
  free: "Free Trial",
  starter: "Starter",
  studio: "Studio",
  elite: "Pro Studio",
  scale: "Scale",
};

export const PAID_BILLING_PLAN_CARDS: Array<{
  key: PaidBillingPlan;
  name: string;
  monthlyInr: string;
  yearlyInr: string;
  monthlyUsd: string;
  yearlyUsd: string;
  description: string;
  highlight?: string;
}> = [
  {
    key: "starter",
    name: "Starter",
    monthlyInr: "Rs 499/mo + GST",
    yearlyInr: "Rs 4,999/year + GST",
    monthlyUsd: "$9/mo",
    yearlyUsd: "$90/year",
    description: "10 GB storage, 5 active events, Pixdrive link delivery.",
  },
  {
    key: "studio",
    name: "Studio",
    monthlyInr: "Rs 1,499/mo + GST",
    yearlyInr: "Rs 14,999/year + GST",
    monthlyUsd: "$29/mo",
    yearlyUsd: "$290/year",
    description: "50 GB storage, 25 active events, 1 custom domain.",
    highlight: "Most Popular",
  },
  {
    key: "elite",
    name: "Pro Studio",
    monthlyInr: "Rs 2,999/mo + GST",
    yearlyInr: "Rs 29,999/year + GST",
    monthlyUsd: "$59/mo",
    yearlyUsd: "$590/year",
    description: "150 GB storage, 75 active events, 3 custom domains.",
  },
  {
    key: "scale",
    name: "Scale",
    monthlyInr: "Rs 6,999/mo + GST",
    yearlyInr: "Rs 69,999/year + GST",
    monthlyUsd: "$129/mo",
    yearlyUsd: "$1,290/year",
    description: "500 GB storage, 200 active events, 10 custom domains.",
  },
];

export const ENTERPRISE_PLAN = {
  name: "Custom",
  price: "Starts Rs 14,999/mo",
  description: "For 500 GB+ storage, heavy downloads, multi-brand studios, and custom support needs.",
};

export const PHOTO_OVERAGE_COPY = "Overages: Rs 199 per extra 10 GB/month, or move to a custom plan for heavy downloads.";

export const RAZORPAY_PLAN_ENV: Record<PaidBillingPlan, Record<BillingInterval, string>> = {
  starter: {
    monthly: "RAZORPAY_PLAN_STARTER_MONTHLY",
    yearly: "RAZORPAY_PLAN_STARTER_YEARLY",
  },
  studio: {
    monthly: "RAZORPAY_PLAN_STUDIO_MONTHLY",
    yearly: "RAZORPAY_PLAN_STUDIO_YEARLY",
  },
  elite: {
    monthly: "RAZORPAY_PLAN_ELITE_MONTHLY",
    yearly: "RAZORPAY_PLAN_ELITE_YEARLY",
  },
  scale: {
    monthly: "RAZORPAY_PLAN_SCALE_MONTHLY",
    yearly: "RAZORPAY_PLAN_SCALE_YEARLY",
  },
};
