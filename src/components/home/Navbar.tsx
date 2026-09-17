import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserRound, LogOut, FileText, Users } from "lucide-react";

export type HomeTab = "site-drive" | "drive";

export default function Navbar({
  activeTab,
  onTabChange,
}: {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}) {
  const isDrive = activeTab === "drive";
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
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-4 py-4 text-white sm:px-8">
      <div
        className={`rounded-full border px-4 py-2 backdrop-blur ${
          isDrive ? "border-[#86b8cf]/20 bg-[#0f2533]/45" : "border-white/10 bg-[#24181b]/35"
        }`}
      >
        <div className="font-display text-2xl font-semibold tracking-tight">Pixdrive</div>
      </div>

      <div
        className={`flex items-center gap-3 rounded-full border px-3 py-2 text-sm backdrop-blur sm:gap-6 ${
          isDrive ? "border-[#86b8cf]/20 bg-[#0f2533]/45" : "border-white/10 bg-black/20"
        }`}
      >
        <button
          type="button"
          onClick={() => onTabChange("site-drive")}
          className={`hidden rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition sm:inline ${
            activeTab === "site-drive"
              ? "border-white/20 bg-white/12 text-white"
              : "border-white/10 text-white/65 hover:text-white"
          }`}
        >
          Site + Drive
        </button>
        <button
          type="button"
          onClick={() => onTabChange("drive")}
          className={`hidden rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition md:inline ${
            activeTab === "drive"
              ? "border-[#7cb8d4]/30 bg-[#2a85b8]/18 text-white"
              : "border-white/10 text-white/65 hover:text-white"
          }`}
        >
          Drive
        </button>
        <Link className="text-sm text-white/80 transition hover:text-white" href="/login">
          Log in
        </Link>
        <Link
          className={`rounded-full px-4 py-2 text-sm font-semibold sm:px-5 ${
            isDrive ? "bg-[#2a85b8] text-white" : "bg-white text-[#2a170d]"
          }`}
          href="/signup"
        >
          Try for free
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:text-white"
            aria-label="Account menu"
          >
            <UserRound className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div
              className={`absolute right-0 top-full z-30 mt-3 w-56 overflow-hidden rounded-2xl border p-2 shadow-xl ${
                isDrive ? "border-[#86b8cf]/30 bg-[#0f2533]" : "border-white/15 bg-[#1f1a18]"
              }`}
            >
              <div className="px-3 py-2 text-sm text-white/70">
                <p className="text-sm font-semibold text-white">Profile</p>
                <p className="text-xs text-white/60">desayn.co@gmail.com</p>
              </div>
              <div className="my-2 h-px bg-white/10" />
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                <Users className="h-4 w-4" />
                Invite friends
              </button>
              <button className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                <FileText className="h-4 w-4" />
                Change plan
              </button>
              <button className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
