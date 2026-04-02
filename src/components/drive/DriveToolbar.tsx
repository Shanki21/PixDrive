"use client";
import React from "react";

export default function DriveToolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          onClick={onAdd}
          className="rounded-xl bg-[#0e7ac4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b649f]"
        >
          + Create event
        </button>
        <div className="text-sm text-[#5d7b97]">Plan each shoot as an event with folders, delivery rules, and client selections.</div>
      </div>

      <div className="self-end sm:self-auto">
        <a href="#" className="text-sm font-semibold text-[#0c6fb2] hover:underline">
          Event setup guide
        </a>
      </div>
    </div>
  );
}
