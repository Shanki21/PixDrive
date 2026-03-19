"use client";

import Link from "next/link";
import React from "react";

export default function Sidebar() {
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc] text-[11px] text-[#4a433d]">
                DR
              </span>
              <span>Drive</span>
            </Link>
          </li>

          <li>
            <Link
              href="/dashboard/card"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc] text-[11px] text-[#4a433d]">
                CD
              </span>
              <span>Card</span>
            </Link>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc] text-[11px] text-[#4a433d]">
                SH
              </span>
              <span>Shop</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc] text-[11px] text-[#4a433d]">
                RV
              </span>
              <span>Reviews</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc] text-[11px] text-[#4a433d]">
                AN
              </span>
              <span>Analytics</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#4a433d] hover:bg-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe6dc] text-[11px] text-[#4a433d]">
                ST
              </span>
              <span>Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efe6dc] text-xs text-[#4a433d]">
          N
        </div>
      </div>
    </aside>
  );
}
