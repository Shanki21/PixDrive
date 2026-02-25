"use client";

import { MoreVertical, RotateCcw } from "lucide-react";
import { MinimalGallery } from "@/types/DriveTableTypes";
import { useMemo, useState } from "react";

export default function TrashTable({
  galleries,
  onRestore,
}: {
  galleries: MinimalGallery[];
  onRestore: (gallery: MinimalGallery) => void;
}) {
  const [query, setQuery] = useState("");
  const [nowMs] = useState(() => Date.now());

  const rows = useMemo(
    () => galleries.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())),
    [galleries, query]
  );

  return (
    <div className="mt-6 bg-white rounded-lg border">
      <div className="p-4 border-b flex justify-between">
        <input
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded-md px-4 py-2 w-64 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-6 px-6 py-3 text-sm text-gray-500 border-b">
        <div>Gallery</div>
        <div>Files</div>
        <div>Created</div>
        <div>Deleted</div>
        <div></div>
        <div></div>
      </div>

      {rows.map((g) => {
        const deletedAt = g.deletedAt ? new Date(g.deletedAt) : null;
        const canRestore = deletedAt
          ? (nowMs - deletedAt.getTime()) / (1000 * 60 * 60 * 24) <= 7
          : false;

        return (
          <div
            key={g.id}
            className="grid grid-cols-6 px-6 py-4 text-sm items-center border-b hover:bg-gray-50"
          >
            <div className="font-medium">{g.name}</div>
            <div>{g.filesCount ?? 0}</div>
            <div>{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "-"}</div>
            <div>{deletedAt ? deletedAt.toLocaleDateString() : "-"}</div>

            <div>
              {canRestore ? (
                <button
                  className="border rounded px-4 py-2 inline-flex items-center gap-2"
                  onClick={() => onRestore(g)}
                >
                  <RotateCcw size={16} /> Restore
                </button>
              ) : (
                <span className="text-gray-400">Not restorable</span>
              )}
            </div>

            <div className="flex justify-end">
              <button className="p-2 rounded hover:bg-gray-100">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
