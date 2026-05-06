import { BookOpenText, CircleHelp, Sparkles } from "lucide-react";

export default function DriveHeader({ totalEvents }: { totalEvents: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead7c5] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a3f13]">
            <Sparkles className="h-3.5 w-3.5" />
            Pixora Events
          </div>
          <h1 className="font-display mt-3 text-4xl font-bold text-[#2a170d] sm:text-5xl">My Events</h1>
          <p className="mt-1 text-sm text-[#7a6a55]">
            Manage published and unpublished events, delivery status, and guest experience settings.
          </p>
        </div>

        <div className="rounded-2xl border border-[#ead7c5] bg-[#fffdf8] px-5 py-4 shadow-sm sm:w-80">
          <div className="mb-2 text-sm font-semibold text-[#5b3a23]">{totalEvents} events in command center</div>
          <div className="h-2 overflow-hidden rounded-full bg-[#f2e4d6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7a3f13] to-[#b9783b]"
              style={{ width: `${Math.min(100, Math.max(14, totalEvents * 12))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#7a6a55]">
            <span className="inline-flex items-center gap-1">
              <BookOpenText className="h-3.5 w-3.5" />
              Event workflow ready
            </span>
            <span className="inline-flex items-center gap-1">
              <CircleHelp className="h-3.5 w-3.5" />
              Tutorial in Home
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
