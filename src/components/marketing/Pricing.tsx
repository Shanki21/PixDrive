"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";

type BillingCycle = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlySave: string;
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
    monthlyPrice: "699",
    yearlyPrice: "6,699",
    yearlySave: "1,689",
    audience: "For beginners and freelancers",
    note: "No website included (intentional to push upgrade).",
    sections: [
      {
        title: "Gallery",
        items: ["100GB storage", "Unlimited galleries", "Share via link", "Basic download option"],
      },
      {
        title: "CRM",
        items: ["Up to 100 clients", "Basic lead tracking", "Manual status updates"],
      },
      {
        title: "Other",
        items: ["Platform branding", "Standard support"],
      },
    ],
    cta: "Start With Starter",
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: "1,999",
    yearlyPrice: "18,999",
    yearlySave: "4,989",
    audience: "Best for serious photographers and studios",
    highlight: "Most Popular",
    sections: [
      {
        title: "Gallery (Premium)",
        items: [
          "500GB storage",
          "Ultra-fast galleries",
          "Client favorites and comments",
          "Password protection",
          "Expiry control",
          "Bulk download control",
          "Watermark control",
        ],
      },
      {
        title: "CRM (Full System)",
        items: [
          "Unlimited clients",
          "Full pipeline (Inquiry to Booking to Delivery)",
          "Automated follow-ups",
          "Payment tracking",
          "Client tagging",
        ],
      },
      {
        title: "Website",
        items: ["Custom domain", "Advanced customization", "Portfolio and blog"],
      },
      {
        title: "Analytics and Premium",
        items: ["Gallery views", "Client activity", "Download tracking", "No watermark", "Priority support"],
      },
    ],
    cta: "Choose Studio",
  },
  {
    id: "elite",
    name: "Elite",
    monthlyPrice: "3,999",
    yearlyPrice: "37,999",
    yearlySave: "9,989",
    audience: "For agencies and high-volume studios",
    sections: [
      {
        title: "Everything In Studio + Scale",
        items: [
          "Priority infrastructure allocation",
          "Advanced team operations",
          "Higher-volume delivery readiness",
          "Premium support lane",
        ],
      },
    ],
    cta: "Go Elite",
  },
];

const addOns = [
  { label: "+100GB Storage", price: "199/month" },
  { label: "AI Photo Sharing", price: "499/month" },
  { label: "Extra Website", price: "199/month" },
];

const referralRows = [
  { plan: "Starter", userDiscount: "10% off first billing", referrerReward: "+7 days" },
  { plan: "Studio", userDiscount: "15% off first billing", referrerReward: "+15 days" },
  { plan: "Elite", userDiscount: "20% off first billing", referrerReward: "+30 days" },
];

export default function Pricing() {
  const yearlyDefault: BillingCycle = "yearly";

  return (
    <section id="pricing" className="relative overflow-hidden border-y border-[#E5E5E5] bg-[#f7faf8] py-24">
      <div className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full bg-[#9bd6c3]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#9cc9ff]/25 blur-3xl" />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0f766e]">Pricing</p>
          <h2 className="mt-3 text-[38px] font-semibold leading-tight tracking-[-0.02em] text-[#111111]">
            Built To Convert From Starter To Studio
          </h2>
          <p className="mx-auto mt-4 max-w-[780px] text-[16px] text-[#5e6e68]">
            Yearly is selected by default to highlight long-term savings. Studio is positioned as the most logical
            choice for serious creators.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[#cfe3db] bg-white px-5 py-2 text-sm font-medium text-[#1d4e42]">
            <span className={yearlyDefault === "yearly" ? "font-semibold text-[#0f766e]" : ""}>Yearly (Default)</span>
            <span className="h-1 w-1 rounded-full bg-[#9bb7ad]" />
            <span>2 months free on yearly plans</span>
          </div>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.id === "studio";
            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4 }}
                className={`relative rounded-3xl border bg-white p-6 shadow-[0_18px_42px_rgba(16,39,32,0.08)] ${
                  featured ? "border-[#0f766e] ring-2 ring-[#0f766e]/20" : "border-[#d9e7e1]"
                }`}
              >
                {plan.highlight ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0f766e] px-4 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                    {plan.highlight}
                  </div>
                ) : null}

                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a867d]">{plan.name}</p>
                <p className="mt-2 text-sm text-[#647970]">{plan.audience}</p>

                <div className="mt-5 rounded-2xl border border-[#e3ede9] bg-[#f8fbfa] p-4">
                  <p className="text-[32px] font-semibold leading-none text-[#101c19]">₹{plan.monthlyPrice}/month</p>
                  <p className="mt-2 text-sm text-[#45675d]">
                    or ₹{plan.yearlyPrice}/year <span className="font-semibold text-[#0f766e]">(Save ₹{plan.yearlySave})</span>
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
                  <p className="mt-5 rounded-xl border border-[#d8e9e2] bg-[#eef8f4] px-3 py-2 text-sm font-semibold text-[#0f766e]">
                    Upgrade to get your own professional website.
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
          <article className="rounded-3xl border border-[#d9e7e1] bg-white p-6 shadow-[0_14px_34px_rgba(16,39,32,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66857c]">Add-ons</p>
            <h3 className="mt-2 text-[26px] font-semibold text-[#111111]">Grow Without Changing Plans</h3>
            <div className="mt-4 space-y-2">
              {addOns.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-[#e2ece8] bg-[#f9fcfb] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[#1f3d35]">{item.label}</span>
                  <span className="text-sm font-semibold text-[#0f766e]">₹{item.price}</span>
                </div>
              ))}
            </div>
          </article>

          <article id="referral" className="rounded-3xl border border-[#d9e7e1] bg-white p-6 shadow-[0_14px_34px_rgba(16,39,32,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66857c]">Referral Model</p>
            <h3 className="mt-2 text-[26px] font-semibold text-[#111111]">Invite Friends, Earn Free Days</h3>
            <p className="mt-2 text-sm text-[#5e746c]">Reward is unlocked only after successful payment.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#e2ece8]">
              <div className="grid grid-cols-3 bg-[#f3faf7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#56736a]">
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
            <p className="mt-4 text-sm font-medium text-[#0f766e]">
              Invite friends and get free subscription days. Your friend gets up to 20% OFF.
            </p>
          </article>
        </motion.div>
      </Container>
    </section>
  );
}




