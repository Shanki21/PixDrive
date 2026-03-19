import Link from "next/link";

export type HomeTab = "site-drive" | "drive";

export default function Navbar({
  activeTab,
  onTabChange,
}: {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}) {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-4 py-4 text-white sm:px-8">
      <div className="font-display text-2xl font-semibold tracking-tight">Pixora</div>

      <div className="flex items-center gap-3 text-sm sm:gap-6">
        <button
          type="button"
          onClick={() => onTabChange("site-drive")}
          className={`hidden rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 sm:inline ${
            activeTab === "site-drive" ? "bg-white/10 text-white" : ""
          }`}
        >
          Site + Drive
        </button>
        <button
          type="button"
          onClick={() => onTabChange("drive")}
          className={`hidden rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 md:inline ${
            activeTab === "drive" ? "bg-white/10 text-white" : ""
          }`}
        >
          Drive
        </button>
        <Link className="text-sm text-white/80 hover:text-white" href="/login">
          Log in
        </Link>
        <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#15161a] sm:px-5" href="/signup">
          Try for free
        </Link>
      </div>
    </nav>
  );
}
