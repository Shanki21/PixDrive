"use client";
import React from "react";

export default function DriveToolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={onAdd} className="bg-blue-300 hover:bg-blue-500 text-white px-4 py-2 rounded">+ Add gallery</button>
        <div className="text-sm text-gray-600">Create client galleries for sharing photos and videos.</div>
      </div>

      <div>
        <a href="#" className="text-blue-500 hover:underline">
          How to create a gallery
        </a>
      </div>
    </div>
  );
}