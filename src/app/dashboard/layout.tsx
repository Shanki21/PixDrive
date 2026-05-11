// src/app/dashboard/layout.tsx

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { getSessionEmailFromCookieStore } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const email = getSessionEmailFromCookieStore(cookieStore);
  if (!email) {
    redirect("/login");
  }

  return (
    <div className="pixora-shell min-h-screen overflow-x-hidden text-[#2a170d] font-['Avenir_Next','Segoe_UI',system-ui,-apple-system,sans-serif]">
      <Sidebar />
      <MobileNav />

      <div className="flex min-h-screen min-w-0 flex-col pb-19.5 md:ml-20 md:pb-0">
        <Header />

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
