"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";
import { ENTERPRISE_PLAN, PHOTO_OVERAGE_COPY } from "@/lib/billing-plans";

type BillingCycle = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlySave: string;
  usdPrice: string;
  audience: string;
  highlight?: string;
  note?: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
  cta: string;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: "499",
    yearlyPrice: "4,999",
    yearlySave: "989",
    usdPrice: "$9/mo",
    audience: "For solo shoots and early studio delivery",
    note: "Pixora link only. Custom domains start on Studio.",
    sections: [
      {
        title: "Gallery",
        items: ["10 GB storage", "5 active events", "Share via Pixora link", "Basic download option"],
      },
      {
        title: "Delivery",
        items: ["Client favorites", "Download tracking", "Basic client delivery controls"],
      },
      {
        title: "Other",
        items: ["Standard support", "Upgrade path for overages"],
      },
    ],
    cta: "Start With Starter",
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: "1,499",
    yearlyPrice: "14,999",
    yearlySave: "2,989",
    usdPrice: "$29/mo",
    audience: "Best for serious photographers and studios",
    highlight: "Most Popular",
    sections: [
      {
        title: "Gallery (Premium)",
        items: [
          "50 GB storage",
          "25 active events",
          "Client favorites and comments",
          "Password protection",
          "Expiry control",
          "Bulk download control",
          "1 custom domain",
        ],
      },
      {
        title: "Client Delivery",
        items: [
          "Client favorites and approvals",
          "Guest registration tracking",
          "Download activity",
          "Review moderation",
        ],
      },
      {
        title: "Website",
        items: ["Own gallery domain", "Pixora link fallback"],
      },
      {
        title: "Analytics and Premium",
        items: ["Gallery views", "Client activity", "Download tracking", "No Pixora lock-in"],
      },
    ],
    cta: "Choose Studio",
  },
  {
    id: "elite",
    name: "Pro Studio",
    monthlyPrice: "2,999",
    yearlyPrice: "29,999",
    yearlySave: "5,989",
    usdPrice: "$59/mo",
    audience: "For busy wedding and event studios",
    sections: [
      {
        title: "Everything In Studio + Volume",
        items: [
          "Priority infrastructure allocation",
          "150 GB storage",
          "75 active events",
          "3 custom domains",
          "Premium support lane",
        ],
      },
    ],
    cta: "Choose Pro Studio",
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: "6,999",
    yearlyPrice: "69,999",
    yearlySave: "13,989",
    usdPrice: "$129/mo",
    audience: "For agencies and high-volume delivery teams",
    sections: [
      {
        title: "High-Volume Delivery",
        items: [
          "500 GB storage",
          "200 active events",
          "10 custom domains",
          "Priority support",
          "Heavy usage review",
        ],
      },
    ],
    cta: "Choose Scale",
  },
];

const addOns = [
  { label: "Extra 10 GB storage", price: "Rs 199/month" },
  { label: "Extra custom domain", price: "Rs 299/month" },
  { label: "Extra 10 active events", price: "Rs 299/month" },
  { label: ENTERPRISE_PLAN.name + " / Enterprise", price: "Rs 14,999+/month" },
];

const referralRows = [
  { plan: "Starter", userDiscount: "10% off first billing", referrerReward: "+7 days" },
  { plan: "Studio", userDiscount: "15% off first billing", referrerReward: "+15 days" },
  { plan: "Pro Studio", userDiscount: "20% off first billing", referrerReward: "+30 days" },
];

export default function Pricing() {
  const yearlyDefault: BillingCycle = "yearly";

  return (
    <section id="pricing" className="relative overflow-hidden border-y border-[#ead7c5] bg-[#fffaf4] py-24">
      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7a3f13]">Pricing</p>
          <h2 className="font-display mt-3 text-[38px] font-semibold leading-tight text-[#2a170d]">
            Priced Around Real Photo Delivery Costs
          </h2>
          <p className="mx-auto mt-4 max-w-[780px] text-[16px] text-[#7a6a55]">
            Storage-based plans keep Pixora affordable for photographers while protecting delivery margins.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[#ead7c5] bg-white px-5 py-2 text-sm font-medium text-[#5b3a23]">
            <span className={yearlyDefault === "yearly" ? "font-semibold text-[#7a3f13]" : ""}>Yearly (Default)</span>
            <span className="h-1 w-1 rounded-full bg-[#9bb7ad]" />
            <span>2 months free on yearly plans</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-[#45675d]">
            Free trial includes 1 event, 2 GB storage, and Pixora link delivery.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const featured = plan.id === "studio";
            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4 }}
                className={`relative rounded-3xl border bg-white p-6 shadow-[0_18px_42px_rgba(73,39,20,0.08)] ${
                  featured ? "border-[#7a3f13] ring-2 ring-[#7a3f13]/20" : "border-[#eadccf]"
                }`}
              >
                {plan.highlight ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7a3f13] px-4 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                    {plan.highlight}
                  </div>
                ) : null}

                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a867d]">{plan.name}</p>
                <p className="mt-2 text-sm text-[#647970]">{plan.audience}</p>

                <div className="mt-5 rounded-2xl border border-[#e3ede9] bg-[#fffaf4] p-4">
                  <p className="text-[32px] font-semibold leading-none text-[#2a170d]">Rs {plan.monthlyPrice}/month</p>
                  <p className="mt-2 text-sm text-[#45675d]">
                    or Rs {plan.yearlyPrice}/year <span className="font-semibold text-[#7a3f13]">(Save Rs {plan.yearlySave})</span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#6b7f78]">
                    Global price starts at {plan.usdPrice}
                  </p>
                </div>

                {plan.note ? (
                  <p className="mt-4 rounded-xl border border-[#f0d8d8] bg-[#fff6f6] px-3 py-2 text-xs font-medium text-[#b24444]">
                    {plan.note}
                  </p>
                ) : null}

                <div className="mt-5 space-y-4">
                  {plan.sections.map((section) => (
                    <div key={`${plan.id}-${section.title}`}>
                      <p className="text-sm font-semibold text-[#1e3b33]">{section.title}</p>
                      <ul className="mt-2 space-y-1 text-sm text-[#5f756d]">
                        {section.items.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {plan.id === "starter" ? (
                  <p className="mt-5 rounded-xl border border-[#eadccf] bg-[#f6eadb] px-3 py-2 text-sm font-semibold text-[#7a3f13]">
                    Upgrade to Studio for your own custom gallery domain.
                  </p>
                ) : null}

                <div className="mt-6">
                  <Link
                    href="/signup"
                    className={buttonClasses({ variant: featured ? "primary" : "secondary", size: "lg" })}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <article className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_14px_34px_rgba(73,39,20,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66857c]">Add-ons</p>
            <h3 className="mt-2 text-[26px] font-semibold text-[#111111]">Grow Without Changing Plans</h3>
            <div className="mt-4 space-y-2">
              {addOns.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-[#f0e4d7] bg-[#fffdf8] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[#3a2112]">{item.label}</span>
                  <span className="text-sm font-semibold text-[#7a3f13]">{item.price}</span>
                </div>
              ))}
            </div>
          </article>

          <article id="referral" className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_14px_34px_rgba(73,39,20,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66857c]">Referral Model</p>
            <h3 className="mt-2 text-[26px] font-semibold text-[#111111]">Invite Friends, Earn Free Days</h3>
            <p className="mt-2 text-sm text-[#5e746c]">Reward is unlocked only after successful payment.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#f0e4d7]">
              <div className="grid grid-cols-3 bg-[#fff7ee] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#56736a]">
                <span>Plan</span>
                <span>Friend Benefit</span>
                <span>Your Reward</span>
              </div>
              {referralRows.map((row) => (
                <div key={row.plan} className="grid grid-cols-3 border-t border-[#edf3f0] px-4 py-3 text-sm text-[#2a493f]">
                  <span className="font-semibold">{row.plan}</span>
                  <span>{row.userDiscount}</span>
                  <span>{row.referrerReward}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-[#7a3f13]">{PHOTO_OVERAGE_COPY}</p>
          </article>
        </motion.div>
      </Container>
    </section>
  );
}
