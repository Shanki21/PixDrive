"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, PlusSquare, QrCode } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/drive", label: "Events", icon: CalendarDays },
    { href: "/dashboard/create-events", label: "Create", icon: PlusSquare },
    { href: "/dashboard/qr-code", label: "QR", icon: QrCode },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d6e7df] bg-[#f7faf8]/95 backdrop-blur md:hidden">
      <ul className="flex overflow-x-auto px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : (pathname?.startsWith(item.href) ?? false);
          return (
            <li key={item.href} className="min-w-20 flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                  active ? "bg-[#0f766e] text-white" : "text-[#35534c]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
