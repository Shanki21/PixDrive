"use client";

import Link from "next/link";
import React from "react";

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-48 flex-col border-r border-white/5 bg-[#0b0d12] text-white shadow-lg md:flex">
      <div className="px-5 py-5">
        <div className="text-xl font-semibold tracking-tight">Pixora</div>
        <div className="mt-3 text-xs text-slate-300">sample.pixora.pro</div>
        <button className="mt-4 inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15">
          My Contacts {"->"}
        </button>
      </div>

      <nav className="mt-4 flex-1 px-3">
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard/drive"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px]">
                DR
              </span>
              <span>Drive</span>
            </Link>
          </li>

          <li>
            <Link
              href="/dashboard/card"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px]">
                CD
              </span>
              <span>Card</span>
            </Link>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px]">
                SH
              </span>
              <span>Shop</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px]">
                RV
              </span>
              <span>Reviews</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px]">
                AN
              </span>
              <span>Analytics</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px]">
                ST
              </span>
              <span>Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs">N</div>
      </div>
    </aside>
  );
}
