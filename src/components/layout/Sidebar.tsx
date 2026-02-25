"use client";

import Link from "next/link";
import React from "react";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-black text-white z-50 flex flex-col">
      <div className="px-6 py-6">
        <div className="text-2xl font-bold">Pixora</div>
        <div className="mt-4 text-sm text-gray-300">sample.pixora.pro</div>
        <button className="mt-4 bg-slate-700 px-4 py-2 rounded-md text-white text-sm inline-flex items-center">
          My Contacts →
        </button>
      </div>

      <nav className="mt-6 flex-1 px-2">
        <ul className="space-y-3">
          <li>
            <Link href="/dashboard/drive" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">📁</span>
              <span>Drive</span>
            </Link>
          </li>

          <li>
            <a className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">💳</span>
              <span>Card</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">🛒</span>
              <span>Shop</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">⭐</span>
              <span>Reviews</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">📊</span>
              <span>Analytics</span>
            </a>
          </li>

          <li>
            <a className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">⚙️</span>
              <span>Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="px-6 py-6">
        <div className="w-10 h-10 rounded-full bg-slate-800/40 flex items-center justify-center">N</div>
      </div>
    </aside>
  );
}