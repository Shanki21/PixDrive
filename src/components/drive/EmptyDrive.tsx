// src/components/drive/EmptyDrive.tsx
"use client";
import React from "react";

type Props = {
  onCreate: () => void;
};

export default function EmptyDrive({ onCreate }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 text-center">
      <h2 className="font-display mb-4 text-4xl font-semibold">Cloud Drive</h2>
      <p className="mb-8 text-[#6b645c]">
        Create client galleries for sharing photos and videos.
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={onCreate}
          className="rounded-full bg-[#101114] px-6 py-2.5 text-sm font-semibold text-white shadow"
        >
          + Add gallery
        </button>
        <a className="self-center text-sm font-semibold text-[#b5553a]">How to create a gallery</a>
      </div>

      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-[#e3d8cc] bg-white shadow-xl">
        <div className="p-5 text-left text-[#15161a]">
          <div className="text-xs uppercase tracking-[0.3em] text-[#8a7f73]">Video instruction</div>
          <div className="mt-3 h-56 rounded-[18px] bg-[linear-gradient(135deg,#e9dac7,#96a4ae)]" />
        </div>
      </div>
    </div>
  );
}
