"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

const v1Items = [
  "OTP login and dashboard access",
  "Create event and manage gallery",
  "Photo upload and cover management",
  "One QR sharing and PIN unlock",
  "Favorites and download delivery",
];

const postponedItems = [
  "Reviews",
  "Analytics",
  "Domains and integrations",
  "Billing, plans, and invoices",
  "Photo selling and advanced design tools",
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-3xl border border-[#d8e8e2] bg-white p-7 shadow-[0_20px_50px_rgba(16,39,32,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d4e7de] bg-[#f4fbf8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Day 1 Scope Freeze
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#122520]">Settings are limited for v1 launch</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f7c73]">
          We are keeping Pixora focused on the core delivery workflow for production readiness. Non-essential modules are
          temporarily hidden until they are fully backend-backed and launch-safe.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-[#d8e8e2] bg-white p-6 shadow-[0_12px_30px_rgba(16,39,32,0.06)]">
          <h2 className="text-lg font-semibold text-[#173029]">Live in v1</h2>
          <ul className="mt-4 space-y-2 text-sm text-[#47675f]">
            {v1Items.map((item) => (
              <li key={item} className="rounded-xl bg-[#f4faf7] px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-[#e9e0d3] bg-[#fffdf8] p-6 shadow-[0_12px_30px_rgba(16,39,32,0.05)]">
          <h2 className="text-lg font-semibold text-[#5f4c31]">Postponed after v1</h2>
          <ul className="mt-4 space-y-2 text-sm text-[#6f5d45]">
            {postponedItems.map((item) => (
              <li key={item} className="rounded-xl bg-[#fff7ea] px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/create-events"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115e59]"
        >
          Create Event
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard/drive"
          className="inline-flex items-center gap-2 rounded-xl border border-[#d5e7df] bg-white px-5 py-2.5 text-sm font-semibold text-[#2b4f45] transition hover:border-[#0f766e] hover:text-[#0f766e]"
        >
          Open My Events
        </Link>
        <Link
          href="/dashboard/qr-code"
          className="inline-flex items-center gap-2 rounded-xl border border-[#d5e7df] bg-white px-5 py-2.5 text-sm font-semibold text-[#2b4f45] transition hover:border-[#0f766e] hover:text-[#0f766e]"
        >
          Open One QR
        </Link>
      </section>
    </div>
  );
}
