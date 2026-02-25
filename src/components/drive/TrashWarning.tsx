import { AlertCircle } from "lucide-react";

export default function TrashWarning() {
  return (
    <div className="flex gap-3 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
      <AlertCircle className="text-yellow-500 mt-0.5" size={20} />

      <p className="text-sm text-gray-700">
        The gallery can be restored within <b>7 days</b> after it has been moved
        to the trash. After that, the data will be permanently deleted and
        cannot be restored.
      </p>
    </div>
  );
}