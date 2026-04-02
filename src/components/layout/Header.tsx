"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, ChevronDown, LogOut, Plus, Search, Settings2, UserRound } from "lucide-react";

export default function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#d7e7e0] bg-[#f7faf8]/95 px-4 py-4 backdrop-blur md:px-8 md:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block min-w-[220px] flex-1 md:max-w-[560px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7a71]" />
          <input
            className="h-11 w-full rounded-xl border border-[#d1e6dd] bg-white pl-9 pr-3 text-sm text-[#1d3831] placeholder:text-[#79948b] focus:border-[#0f766e] focus:outline-none"
            placeholder="Search events, documents, guests..."
          />
        </label>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-[#d1e6dd] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2f6156] sm:inline-flex">
            <CalendarClock className="h-4 w-4" />
            {today}
          </div>
          <Link
            href="/dashboard/create-events"
            className="inline-flex items-center gap-1 rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#115e59]"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1e6dd] bg-white text-[#2d554b] hover:bg-[#eef7f3]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d1e6dd] bg-white px-2.5 py-2 text-[#2d554b] hover:bg-[#eef7f3]"
              aria-label="Account menu"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#e7f4ef]">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="hidden text-xs font-semibold sm:inline">MR</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-[#d4e8df] bg-white shadow-xl">
                <div className="px-4 py-3 text-sm text-[#537269]">
                  <p className="font-semibold text-[#142622]">Profile</p>
                  <p className="text-xs">studio@pixora.pro</p>
                </div>
                <div className="h-px bg-[#edf5f1]" />
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#2d554b] hover:bg-[#f4faf7]"
                >
                  <Settings2 className="h-4 w-4" />
                  Studio settings
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#2d554b] hover:bg-[#f4faf7]"
                >
                  <CalendarClock className="h-4 w-4" />
                  Activity report
                </Link>
                <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm text-[#d32650] hover:bg-[#fff1f4]">
                  <LogOut className="h-4 w-4" />
                  Log out
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#608178] sm:hidden">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>{today}</span>
      </div>
    </header>
  );
}
