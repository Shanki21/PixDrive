// src/app/dashboard/layout.tsx

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="ml-60 flex flex-col py-15 min-h-screen">

        {/* Top Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 px-6 py-6">
          {children}
        </main>

      </div>
    </div>
  );
}