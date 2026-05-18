"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { BarChart3, CalendarDays, Home, PlusSquare, QrCode, Settings, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

type NavBadge = {
  label: string;
  tone: "new" | "beta";
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: NavBadge;
};

export default function Sidebar() {
  const pathname = usePathname();
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Home",
      icon: Home,
    },
    {
      href: "/dashboard/drive",
      label: "My Events",
      icon: CalendarDays,
    },
    {
      href: "/dashboard/create-events",
      label: "Create Event",
      icon: PlusSquare,
    },
    {
      href: "/dashboard/qr-code",
      label: "One QR",
      icon: QrCode,
      badge: { label: "NEW", tone: "new" },
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="pixora-sidebar-bg fixed inset-y-0 left-0 z-50 hidden w-20 flex-col items-center border-r border-[#eadccf] text-[#3a2112] md:flex">
      <div className="flex h-20 w-full items-center justify-center border-b border-[#eadccf]">
        <Link
          href="/dashboard"
          aria-label="Pixora dashboard"
          className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#7a3f13] shadow-[0_10px_24px_rgba(73,39,20,0.08)] transition hover:bg-[#f4e5d3]"
        >
          <Sparkles className="h-5 w-5" />
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-[#eadccf] bg-white px-3 py-2 text-sm font-semibold text-[#3a2112] opacity-0 shadow-[0_14px_30px_rgba(73,39,20,0.14)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
            Pixora Studio
          </span>
        </Link>
      </div>

      <nav className="mt-4 flex-1 px-2">
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
                  aria-label={item.label}
                  title={item.label}
                  className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl transition ${
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
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-[#eadccf] bg-white px-3 py-2 text-sm font-semibold text-[#3a2112] opacity-0 shadow-[0_14px_30px_rgba(73,39,20,0.14)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] ${
                          item.badge.tone === "new"
                            ? "bg-[#f6dfc6] text-[#8a4b1a]"
                            : "bg-[#feefca] text-[#a35f00]"
                        }`}
                      >
                        {item.badge.label}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="w-full border-t border-[#eadccf] p-3" />
    </aside>
  );
}
