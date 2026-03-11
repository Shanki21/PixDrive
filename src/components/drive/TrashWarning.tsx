import { AlertCircle } from "lucide-react";

export default function TrashWarning() {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-amber-100 bg-amber-50 px-4 py-3">
      <AlertCircle className="mt-0.5 shrink-0 text-amber-500" size={18} />

      <p className="text-sm font-normal text-gray-700">
        The gallery can be restored within <b>7 days</b> after it has been moved
        to the trash. After that, the data will be permanently deleted and
        cannot be restored.
      </p>
    </div>
  );
}
