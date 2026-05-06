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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead7c5] bg-[#fffaf4]/95 backdrop-blur md:hidden">
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
                  active ? "bg-[#5b2b0c] text-white shadow-[0_10px_18px_rgba(91,43,12,0.2)]" : "text-[#6d4426]"
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
