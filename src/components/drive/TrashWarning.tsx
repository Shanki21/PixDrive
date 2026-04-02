import { AlertCircle } from "lucide-react";

export default function TrashWarning() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#f7dba2] bg-[#fff8e8] px-4 py-3">
      <AlertCircle className="mt-0.5 shrink-0 text-[#d08a0f]" size={18} />

      <p className="text-sm font-normal text-[#805d1a]">
        The event can be restored within <b>7 days</b> after it has been moved
        to the archive. After that, the data will be permanently deleted and
        cannot be restored.
      </p>
    </div>
  );
}
