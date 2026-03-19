"use client";

import React from "react";

export default function Topbar() {
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
        <div className="h-10 w-10 rounded-full bg-[#e7e0d8]" />
      </div>
    </header>
  );
}
