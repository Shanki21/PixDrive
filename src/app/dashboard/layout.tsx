// src/app/dashboard/layout.tsx

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />

      <div className="flex min-h-screen flex-col pb-16 md:ml-52 md:pb-0">
        <Header />

        <main className="flex-1 px-4 py-4 md:px-6 md:py-6 md:pt-20">
          {children}
        </main>
      </div>
    </div>
  );
}
