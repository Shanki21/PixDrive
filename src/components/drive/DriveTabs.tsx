"use client";

import { Folder, Trash2 } from "lucide-react";

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
    <div className="mt-4 border-b border-gray-200">
      <div className="flex gap-5 sm:gap-7">

        {/* Galleries */}
        <button
          onClick={() => onChange?.("galleries")}
          className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition sm:text-[15px]
          ${
            active === "galleries"
              ? "border-b-2 border-blue-600 text-black"
              : "border-b-2 border-transparent text-gray-500 hover:text-black"
          }`}
        >
          <Folder size={15} />
          Galleries
        </button>

        {/* Trash */}
        {showTrash && (
          <button
            onClick={() => onChange?.("trash")}
            className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition sm:text-[15px]
            ${
              active === "trash"
                ? "border-b-2 border-blue-600 text-black"
                : "border-b-2 border-transparent text-gray-500 hover:text-black"
            }`}
          >
            <Trash2 size={15} />
            Trash
            {trashCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-400 px-1 text-[11px] font-semibold text-white">
                {trashCount}
              </span>
            )}
          </button>
        )}

      </div>
    </div>
  );
}
