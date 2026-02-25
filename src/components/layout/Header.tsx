"use client";

import React from "react";

export default function Topbar() {
  return (
    <header className="fixed left-56 right-0 top-0 h-16 bg-white border-b z-40 flex items-center px-6">
      <div className="flex-1">
        <div className="inline-flex items-center gap-4">
          <div className="rounded-full bg-white/90 px-3 py-1 border text-sm">Recommended to do <span className="ml-2 inline-block bg-red-500 text-white rounded-full px-2 text-xs">1</span></div>
          <div className="text-sm text-red-500">3 days left</div>
          <a className="text-sm text-blue-600 underline" href="#">Discount 35%</a>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm">💡 Your ideas</div>
        <div className="text-sm">❓ Help</div>
        <div className="w-10 h-10 rounded-full bg-gray-200" />
      </div>
    </header>
  );
}