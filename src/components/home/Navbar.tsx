import Link from "next/link";

export type HomeTab = "site-drive" | "drive";

export default function Navbar({
  activeTab,
  onTabChange,
}: {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}) {
  const isDrive = activeTab === "drive";

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-4 py-4 text-white sm:px-8">
      <div
        className={`rounded-full border px-4 py-2 backdrop-blur ${
          isDrive ? "border-[#86b8cf]/20 bg-[#0f2533]/45" : "border-white/10 bg-[#24181b]/35"
        }`}
      >
        <div className="font-display text-2xl font-semibold tracking-tight">Pixora</div>
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
            isDrive ? "bg-[#2a85b8] text-white" : "bg-white text-[#15161a]"
          }`}
          href="/signup"
        >
          Try for free
        </Link>
      </div>
    </nav>
  );
}
