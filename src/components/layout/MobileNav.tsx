"use client";

import Link from "next/link";

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-2">
        <li>
          <Link href="/dashboard/drive" className="block px-4 py-3 text-center text-sm font-semibold text-slate-700">
            Drive
          </Link>
        </li>
        <li>
          <Link href="/dashboard/card" className="block px-4 py-3 text-center text-sm font-semibold text-slate-700">
            Card
          </Link>
        </li>
      </ul>
    </nav>
  );
}
