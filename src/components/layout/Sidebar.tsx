"use client";

import Link from "next/link";
import React from "react";
import {
  BarChart3,
  CreditCard,
  Database,
  MessageCircleMore,
  Settings,
  ShoppingCart,
} from "lucide-react";

export default function Sidebar() {
  const navIconClass = "h-[18px] w-[18px] text-[#4a433d]";

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-[#e3d8cc] bg-[#f7f3ee] text-[#15161a] shadow-lg md:flex">
      <div className="px-6 py-6">
        <div className="font-display text-2xl font-semibold tracking-tight">Pixora</div>
        <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8a7f73]">sample.pixora.pro</div>
        <button className="mt-5 inline-flex items-center rounded-full border border-[#d9cfc4] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#4a433d] hover:bg-[#f1e8de]">
          My Contacts {"->"}
        </button>
      </div>

      <nav className="mt-4 flex-1 px-3">
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard/drive"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc]">
                <Database className={navIconClass} />
              </span>
              <span>Drive</span>
            </Link>
          </li>

          <li>
            <Link
              href="/dashboard/card"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc]">
                <CreditCard className={navIconClass} />
              </span>
              <span>Card</span>
            </Link>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc]">
                <ShoppingCart className={navIconClass} />
              </span>
              <span>Shop</span>
            </a>
          </li>

          <li>
            <Link
              href="/dashboard/reviews"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc]">
                <MessageCircleMore className={navIconClass} />
              </span>
              <span>Reviews</span>
            </Link>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc]">
                <BarChart3 className={navIconClass} />
              </span>
              <span>Analytics</span>
            </a>
          </li>

          <li>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc]">
                <Settings className={navIconClass} />
              </span>
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
