"use client";
import React from "react";

export default function DriveToolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          onClick={onAdd}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add gallery
        </button>
        <div className="text-sm text-gray-600">Create client galleries for sharing photos and videos.</div>
      </div>

      <div className="self-end sm:self-auto">
        <a href="#" className="text-blue-500 hover:underline">
          How to create a gallery
        </a>
      </div>
    </div>
  );
}
