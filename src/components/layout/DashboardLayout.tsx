"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pixora-dashboard-bg min-h-screen">
      <Sidebar />
      <Header />
      {/* main area: margin-left matches sidebar width (w-56), padding-top matches topbar height (h-16) */}
      <main className="min-h-screen md:ml-56 md:pt-16">
        {/* full-width content with responsive side padding to avoid clipping dialogs */}
        <div className="w-full px-4 pb-10 pt-4 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
