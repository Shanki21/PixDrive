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
    <div className="min-h-screen overflow-x-hidden bg-[#f7faf8] text-[#13231f] font-['Plus_Jakarta_Sans','Segoe_UI',system-ui,-apple-system,sans-serif]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.2),transparent_46%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.1),transparent_52%)]" />
      <Sidebar />
      <MobileNav />

      <div className="flex min-h-screen min-w-0 flex-col pb-19.5 md:ml-72 md:pb-0">
        <Header />

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
