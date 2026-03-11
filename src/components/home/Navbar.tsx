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
      <div className="text-xl font-bold">Pixora</div>

      <div className="flex items-center gap-3 text-sm sm:gap-6">
        <button
          type="button"
          onClick={() => onTabChange("site-drive")}
          className={`hidden sm:inline underline-offset-4 ${activeTab === "site-drive" ? "underline" : ""}`}
        >
          Site + Drive
        </button>
        <button
          type="button"
          onClick={() => onTabChange("drive")}
          className={`hidden md:inline underline-offset-4 ${activeTab === "drive" ? "underline" : ""}`}
        >
          Drive
        </button>
        <Link className="underline" href="/login">
          Log in
        </Link>
        <Link className="rounded-full border px-4 py-2 sm:px-5" href="/signup">
          Try for free
        </Link>
      </div>
    </nav>
  );
}
