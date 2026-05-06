"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  CalendarDays,
  Crown,
  Home,
  PlusSquare,
  QrCode,
  ScanLine,
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
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-[#eadccf] bg-[linear-gradient(180deg,#fffaf4_0%,#fffdf8_44%,#f6eadb_100%)] text-[#3a2112] md:flex">
      <div className="relative overflow-hidden border-b border-[#eadccf] px-6 pb-6 pt-7">
        <div className="relative inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">
          <Sparkles className="h-3.5 w-3.5" />
          Pixora Studio
        </div>
        <div className="relative mt-4">
          <p className="font-display text-[38px] font-bold leading-none text-[#2a170d]">Pixora</p>
          <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-[#7a6a55]">
            Build premium event experiences and deliver galleries with confidence.
          </p>
        </div>
      </div>

      <nav className="mt-4 flex-1 px-3">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a735f]">Workspace</p>
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
                      ? "bg-[linear-gradient(135deg,#7a3f13_0%,#5b2b0c_100%)] text-white shadow-[0_16px_28px_rgba(122,63,19,0.24)]"
                      : "text-[#5f3b22] hover:bg-white/90 hover:text-[#2a170d] hover:shadow-[0_8px_24px_rgba(73,39,20,0.08)]"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-[#6d4426] group-hover:bg-[#f4e5d3] group-hover:text-[#7a3f13]"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight">{item.label}</span>
                    <span
                      className={`mt-0.5 block truncate text-[11px] leading-tight ${
                        active ? "text-[#f8ead9]" : "text-[#a0866e]"
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
                            : "bg-[#f6dfc6] text-[#8a4b1a]"
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

      <div className="border-t border-[#eadccf] p-4">
        <div className="rounded-3xl border border-[#d8b895] bg-[linear-gradient(150deg,#7a3f13_0%,#5b2b0c_100%)] p-4 text-white shadow-[0_20px_34px_rgba(122,63,19,0.3)]">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#f8ead9]">
            <Crown className="h-3.5 w-3.5" />
            Creator Suite
          </div>
          <p className="font-display mt-2 text-[21px] font-bold leading-tight">Upgrade your delivery stack</p>
          <p className="mt-2 text-sm text-[#f8ead9]">
            Unlock branded microsites, automation flows, and higher upload limits for every event.
          </p>
          <Link
            href="/dashboard/qr-code"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a3f13] transition hover:bg-[#fff1df]"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Open One QR
          </Link>
        </div>
      </div>
    </aside>
  );
}
