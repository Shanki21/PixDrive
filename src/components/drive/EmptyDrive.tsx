// src/components/drive/EmptyDrive.tsx
"use client";
import React from "react";

type Props = {
  onCreate: () => void;
};

export default function EmptyDrive({ onCreate }: Props) {
  return (
    <div className="max-w-6xl mx-auto py-20 px-6 text-center">
      <h2 className="text-3xl font-semibold mb-4">Cloud Drive</h2>
      <p className="text-gray-600 mb-8">
        Create client galleries for sharing photos and videos.
      </p>

      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={onCreate}
          className="bg-blue-600 text-white px-5 py-2 rounded shadow"
        >
          + Add gallery
        </button>
        <a className="text-sm text-blue-600 self-center">How to create a gallery</a>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-lg overflow-hidden shadow-lg bg-black">
        <div className="p-4 text-left text-white">
          <div className="text-sm mb-2">Video instruction</div>
          <div className="h-56 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')] bg-cover bg-center rounded" />
        </div>
      </div>
    </div>
  );
}