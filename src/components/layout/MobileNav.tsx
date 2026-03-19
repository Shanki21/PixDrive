"use client";

import Link from "next/link";

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e3d8cc] bg-white/90 backdrop-blur md:hidden">
      <ul className="grid grid-cols-2">
        <li>
          <Link href="/dashboard/drive" className="block px-4 py-3 text-center text-sm font-semibold text-[#3b362f]">
            Drive
          </Link>
        </li>
        <li>
          <Link href="/dashboard/card" className="block px-4 py-3 text-center text-sm font-semibold text-[#3b362f]">
            Card
          </Link>
        </li>
      </ul>
    </nav>
  );
}
