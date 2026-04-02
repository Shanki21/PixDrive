"use client";

import { Archive, CalendarDays } from "lucide-react";

type Props = {
  showTrash?: boolean;
  active: "galleries" | "trash";
  onChange?: (tab: "galleries" | "trash") => void;
  trashCount?: number;
};

export default function DriveTabs({
  showTrash = true,
  active,
  onChange,
  trashCount = 0,
}: Props) {
  return (
    <div className="mt-6 border-b border-[#d7e6f4]">
      <div className="flex gap-5 sm:gap-7">
        <button
          onClick={() => onChange?.("galleries")}
          className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition sm:text-[15px]
          ${
            active === "galleries"
              ? "border-b-2 border-[#0e7ac4] text-[#102033]"
              : "border-b-2 border-transparent text-[#6b8aa7] hover:text-[#102033]"
          }`}
        >
          <CalendarDays size={15} />
          Events
        </button>

        {showTrash && (
          <button
            onClick={() => onChange?.("trash")}
            className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition sm:text-[15px]
            ${
              active === "trash"
                ? "border-b-2 border-[#0e7ac4] text-[#102033]"
                : "border-b-2 border-transparent text-[#6b8aa7] hover:text-[#102033]"
            }`}
          >
            <Archive size={15} />
            Archive
            {trashCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3d6486] px-1 text-[11px] font-semibold text-white">
                {trashCount}
              </span>
            )}
          </button>
        )}

      </div>
    </div>
  );
}
