"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  BarChart3,
  CalendarDays,
  Crown,
  Home,
  MessageSquareQuote,
  PlusSquare,
  QrCode,
  ScanLine,
  Settings2,
  Sparkles,
} from "lucide-react";
import { usePathname } from "next/navigation";

type NavBadge = {
  label: string;
  tone: "new" | "beta";
};

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  badge?: NavBadge;
};

export default function Sidebar() {
  const pathname = usePathname();
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Home",
      description: "Studio overview",
      icon: Home,
    },
    {
      href: "/dashboard/drive",
      label: "My Events",
      description: "Manage galleries",
      icon: CalendarDays,
    },
    {
      href: "/dashboard/create-events",
      label: "Create Event",
      description: "Launch a new workflow",
      icon: PlusSquare,
    },
    {
      href: "/dashboard/qr-code",
      label: "One QR",
      description: "Guest access + delivery",
      icon: QrCode,
      badge: { label: "NEW", tone: "new" },
    },
    {
      href: "/dashboard/reviews",
      label: "Reviews",
      description: "Collect testimonials",
      icon: MessageSquareQuote,
      badge: { label: "BETA", tone: "beta" },
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      description: "Track event performance",
      icon: BarChart3,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      description: "Studio preferences",
      icon: Settings2,
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-[#d4e6df] bg-[linear-gradient(180deg,#f5faf8_0%,#f9fcfb_38%,#eef8f4_100%)] text-[#17322c] md:flex">
      <div className="relative overflow-hidden border-b border-[#d7e8e1] px-6 pb-6 pt-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(15,118,110,0.25)_0%,rgba(15,118,110,0)_68%)]" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22)_0%,rgba(37,99,235,0)_70%)]" />

        <div className="relative inline-flex items-center gap-2 rounded-full border border-[#cfe7de] bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0d6f67] backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          Pixora Studio
        </div>
        <div className="relative mt-4">
          <p className="text-[34px] font-extrabold leading-none tracking-[-0.04em] text-[#0f1f1b]">Pixora</p>
          <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-[#4b6760]">
            Build premium event experiences and deliver galleries with confidence.
          </p>
        </div>
      </div>

      <nav className="mt-4 flex-1 px-3">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#628278]">Workspace</p>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : (pathname?.startsWith(item.href) ?? false);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                    active
                      ? "bg-[linear-gradient(135deg,#0f766e_0%,#1d4ed8_130%)] text-white shadow-[0_16px_28px_rgba(15,118,110,0.24)]"
                      : "text-[#2f4f47] hover:bg-white/90 hover:text-[#12332d] hover:shadow-[0_8px_24px_rgba(16,39,32,0.08)]"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-[#245146] group-hover:bg-[#eaf5f1] group-hover:text-[#0e665f]"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight">{item.label}</span>
                    <span
                      className={`mt-0.5 block truncate text-[11px] leading-tight ${
                        active ? "text-[#d8f4ef]" : "text-[#6b8880]"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                  {item.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] ${
                        item.badge.tone === "new"
                          ? active
                            ? "bg-white/20 text-white"
                            : "bg-[#daf8ec] text-[#0f7f5e]"
                          : active
                            ? "bg-white/20 text-white"
                            : "bg-[#feefca] text-[#a35f00]"
                      }`}
                    >
                      {item.badge.label}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#d7e8e1] p-4">
        <div className="rounded-3xl border border-[#c9dfd7] bg-[linear-gradient(150deg,#0f766e_0%,#0f5d8a_100%)] p-4 text-white shadow-[0_20px_34px_rgba(15,118,110,0.3)]">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#d2f6f1]">
            <Crown className="h-3.5 w-3.5" />
            Creator Suite
          </div>
          <p className="mt-2 text-lg font-bold leading-tight tracking-[-0.02em]">Upgrade your delivery stack</p>
          <p className="mt-2 text-sm text-[#d6f3ee]">
            Unlock branded microsites, automation flows, and higher upload limits for every event.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f5e63] transition hover:bg-[#e8fcf6]"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Explore Plans
          </Link>
        </div>
      </div>
    </aside>
  );
}
