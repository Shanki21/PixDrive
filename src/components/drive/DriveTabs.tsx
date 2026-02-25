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
      <div className="flex gap-8">

        {/* Galleries */}
        <button
          onClick={() => onChange?.("galleries")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition
          ${
            active === "galleries"
              ? "border-b-2 border-blue-600 text-black"
              : "border-b-2 border-transparent text-gray-500 hover:text-black"
          }`}
        >
          <Folder size={16} />
          Galleries
        </button>

        {/* Trash */}
        {showTrash && (
          <button
            onClick={() => onChange?.("trash")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition
            ${
              active === "trash"
                ? "border-b-2 border-blue-600 text-black"
                : "border-b-2 border-transparent text-gray-500 hover:text-black"
            }`}
          >
            <Trash2 size={16} />
            Trash
            {trashCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-gray-400 text-white text-xs inline-flex items-center justify-center">
                {trashCount}
              </span>
            )}
          </button>
        )}

      </div>
    </div>
  );
}
