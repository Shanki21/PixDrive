"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <Sidebar />
      <Header />
      {/* main area: margin-left matches sidebar width (w-56), padding-top matches topbar height (h-16) */}
      <main className="ml-56 pt-16 min-h-screen">
        {/* constrain width like original UI and add horizontal padding */}
        <div className="max-w-7xl mx-auto px-6">{children}</div>
      </main>
    </div>
  );
}