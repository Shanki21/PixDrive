"use client";

import { useEffect, useRef, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, ChevronDown, LogOut, Plus, Search, Settings2 } from "lucide-react";

export default function Topbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileEmail, setProfileEmail] = useState("studio@pixora.pro");
  const [profileInitials, setProfileInitials] = useState("CR");
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).toUpperCase();

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

  useEffect(() => {
    let active = true;

    const loadMe = async () => {
      try {
        const res = await fetchWithRetry("/api/auth/me", { cache: "no-store" }, { dedupeKey: `client:me:load` });
        if (!res.ok) return;
        const data = (await res.json()) as { email?: string };
        const email = String(data.email ?? "").trim().toLowerCase();
        if (!active || !email) return;
        const local = email.split("@")[0] ?? "";
        const initials = local
          .split(/[._-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("");
        setProfileEmail(email);
        setProfileInitials(initials || "CR");
      } catch {
        // Ignore profile fetch failures.
      }
    };

    void loadMe();
    return () => {
      active = false;
    };
  }, []);

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetchWithRetry("/api/auth/logout", { method: "POST" }, { dedupeKey: `client:logout:${profileEmail}` });
    } catch {
      // Ignore logout API failures and continue client redirect.
    } finally {
      setMenuOpen(false);
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#ead7c5] bg-[#fffaf4] px-4 py-4 md:px-8 md:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block min-w-55 flex-1 md:max-w-140">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7a71]" />
          <input
            className="h-12 w-full rounded-2xl border border-[#ead7c5] bg-[#fffdf8] pl-11 pr-4 text-sm text-[#3a2112] placeholder:text-[#a0866e] focus:border-[#7a3f13] focus:outline-none"
            placeholder="Search events, documents, guests..."
          />
        </label>

        <div className="flex items-center gap-2">
          <div className="hidden h-12 items-center gap-2 rounded-2xl border border-[#ead7c5] bg-[#fffdf8] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#5b3a23] shadow-sm sm:inline-flex">
            <CalendarClock className="h-4 w-4" />
            {today}
          </div>
          <Link
            href="/dashboard/create-events"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#5b2b0c] px-5 text-sm font-semibold text-white transition hover:bg-[#7a3f13]"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ead7c5] bg-[#fffdf8] text-[#5b3a23] hover:bg-[#f4e5d3]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#ead7c5] bg-[#fffdf8] px-2.5 text-[#5b3a23] hover:bg-[#f4e5d3]"
              aria-label="Account menu"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d8b895] bg-[#f4e5d3] text-xs font-semibold">
                {profileInitials.slice(0, 1)}
              </span>
              <span className="hidden text-xs font-semibold sm:inline">{profileInitials}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-[#eadccf] bg-white shadow-xl">
                <div className="px-4 py-3 text-sm text-[#7a6a55]">
                  <p className="font-semibold text-[#2a170d]">Profile</p>
                  <p className="text-xs">{profileEmail}</p>
                </div>
                <div className="h-px bg-[#f4eadf]" />
                <Link
                  href="/dashboard/qr-code"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#5b3a23] hover:bg-[#fff7ee]"
                >
                  <Settings2 className="h-4 w-4" />
                  One QR
                </Link>
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#d32650] hover:bg-[#fff1f4] disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#7a6a55] sm:hidden">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>{today}</span>
      </div>
    </header>
  );
}
