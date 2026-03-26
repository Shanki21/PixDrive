"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileText, LogOut, UserRound, Users } from "lucide-react";

export default function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    <header className="fixed left-56 right-0 top-0 z-40 hidden h-16 items-center border-b border-white/30 bg-white/70 px-6 backdrop-blur md:flex">
      <div className="flex-1">
        <div className="inline-flex items-center gap-4">
          <div className="rounded-full border border-[#e5d9cc] bg-white px-3 py-1 text-sm text-[#3b362f]">
            Recommended to do{" "}
            <span className="ml-2 inline-block rounded-full bg-[#d97757] px-2 text-xs text-white">1</span>
          </div>
          <div className="text-sm text-[#b5553a]">3 days left</div>
          <a className="text-sm text-[#101114] underline" href="#">
            Discount 35%
          </a>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm text-[#3b362f]">Your ideas</div>
        <div className="text-sm text-[#3b362f]">Help</div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5d9cc] bg-white text-[#3b362f] hover:bg-[#f7f3ee]"
            aria-label="Account menu"
          >
            <UserRound className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-40 mt-3 w-60 overflow-hidden rounded-2xl border border-[#efe6dc] bg-white shadow-xl">
              <div className="px-4 py-3 text-sm text-[#8a7f73]">
                <p className="font-semibold text-[#15161a]">Profile</p>
                <p className="text-xs">desayn.co@gmail.com</p>
              </div>
              <div className="h-px bg-[#f2ece4]" />
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#4a433d] hover:bg-[#f7f3ee]">
                <Users className="h-4 w-4" />
                Invite friends
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#4a433d] hover:bg-[#f7f3ee]">
                <FileText className="h-4 w-4" />
                Change plan
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#e11d48] hover:bg-[#fde8ee]">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
